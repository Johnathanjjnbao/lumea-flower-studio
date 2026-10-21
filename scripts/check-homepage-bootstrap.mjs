import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

class FakeQuery {
  constructor(state, table) { this.state = state; this.table = table; this.filters = []; }
  select() { return this; }
  order() { return this; }
  eq(field, value) { this.filters.push([field, value]); return this; }
  async single() {
    const result = this.read();
    return result.data.length === 1 ? { data: result.data[0], error: null } : { data: null, error: { code: "PGRST116" } };
  }
  async insert(rows) {
    if (this.state.denyInsert) return { error: { code: "42501" } };
    const values = Array.isArray(rows) ? rows : [rows];
    this.state.tables[this.table].push(...values.map((row) => ({ ...row, id: row.id ?? crypto.randomUUID() })));
    this.state.writes.push({ table: this.table, rows: values });
    return { error: null };
  }
  async upsert(rows) {
    if (this.state.denyInsert) return { error: { code: "42501" } };
    this.state.tables[this.table].push(...rows);
    this.state.writes.push({ table: this.table, rows });
    return { error: null };
  }
  update(values) { this.updateValues = values; return this; }
  read() {
    const data = this.state.tables[this.table].filter((row) => this.filters.every(([field, value]) => row[field] === value));
    if (this.updateValues) {
      if (this.state.denyInsert) return { data: null, error: { code: "42501" } };
      for (const row of data) Object.assign(row, this.updateValues);
      this.state.writes.push({ table: this.table, rows: data });
    }
    return { data, error: null };
  }
  then(resolve, reject) { return Promise.resolve(this.read()).then(resolve, reject); }
}

function fakeClient(initial = {}, denyInsert = false) {
  const state = {
    tables: {
      homepage_sections: [...(initial.homepage_sections ?? [])],
      homepage_feature_items: [...(initial.homepage_feature_items ?? [])],
      homepage_section_translations: [...(initial.homepage_section_translations ?? [])],
    },
    writes: [], denyInsert,
  };
  return { state, client: { from: (table) => new FakeQuery(state, table) } };
}

const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
try {
  const { SupabaseAdminHomepageRepository } = await vite.ssrLoadModule("/src/features/admin/data/adminHomepageRepository.ts");
  const { homepageSectionKeys } = await vite.ssrLoadModule("/src/features/homepage/types.ts");

  const empty = fakeClient();
  const repository = new SupabaseAdminHomepageRepository(empty.client);
  assert.deepEqual(await repository.getHomepage(), { sections: [], products: [], occasionMediaSlots: [], budgetMediaSlots: [] });
  await repository.initializeMissingStructure();
  assert.equal(empty.state.tables.homepage_sections.length, 10);
  assert.deepEqual(empty.state.tables.homepage_sections.map((row) => row.section_key), homepageSectionKeys);
  assert.deepEqual(empty.state.tables.homepage_sections.map((row) => row.display_order), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  assert(empty.state.tables.homepage_sections.every((row) => row.enabled === false));
  assert.equal(empty.state.tables.homepage_sections.find((row) => row.section_key === "hero").primary_cta_target, "/flowers");
  assert.equal(empty.state.tables.homepage_sections.find((row) => row.section_key === "florist_choice").primary_cta_target, "/flowers");
  assert.equal(empty.state.tables.homepage_feature_items.length, 3);
  assert(empty.state.tables.homepage_feature_items.every((row) => row.homepage_section_id === empty.state.tables.homepage_sections.find((section) => section.section_key === "why_lumea").id));
  assert.deepEqual(empty.state.writes.map((write) => write.table), ["homepage_sections", "homepage_feature_items"]);

  await repository.initializeMissingStructure();
  assert.equal(empty.state.writes.length, 2, "A second initialization must not overwrite existing rows.");

  const partiallySeeded = fakeClient({
    homepage_sections: [{ id: "existing-hero", section_key: "hero", display_order: 5, enabled: true }],
  });
  await new SupabaseAdminHomepageRepository(partiallySeeded.client).initializeMissingStructure();
  assert.equal(partiallySeeded.state.tables.homepage_sections.find((row) => row.section_key === "hero").display_order, 5);
  assert.equal(partiallySeeded.state.writes[0].rows.length, 9);

  const denied = fakeClient({}, true);
  await assert.rejects(() => new SupabaseAdminHomepageRepository(denied.client).initializeMissingStructure(), /42501/);
  assert.equal(denied.state.writes.length, 0);

  const publish = fakeClient({ homepage_sections: [{ id: "hero-1", section_key: "hero", enabled: false }] });
  const copy = { eyebrow: "", titleOne: "Hoa", titleTwo: "", body: "", note: "", primaryCtaLabel: "", secondaryCtaLabel: "", secondaryHeading: "", secondaryBody: "", detailOneLabel: "", detailOneValue: "", detailTwoLabel: "", detailTwoValue: "" };
  await new SupabaseAdminHomepageRepository(publish.client).saveSection({
    id: "hero-1", key: "hero", enabled: false, primaryCtaTarget: null, secondaryCtaTarget: null,
    visit: { mapEnabled: false, mapQuery: "", googleMapsUrl: "" }, vi: copy, ko: { ...copy, titleOne: "꽃" },
    media: [], features: [], curatedProductIds: [],
  });
  assert.deepEqual(publish.state.writes.map((write) => write.table), ["homepage_section_translations", "homepage_sections"], "VI/KO copy must be committed before a newly enabled section becomes public.");
  assert.equal(publish.state.tables.homepage_sections[0].enabled, true);

  const { HomepageMediaPanel } = await vite.ssrLoadModule("/src/features/admin/components/HomepageMediaPanel.tsx");
  const html = renderToStaticMarkup(createElement(HomepageMediaPanel, {
    section: { id: "hero-1", key: "hero", media: [] },
    availableSlots: [{ key: "hero-main", label: "Ảnh chính" }, { key: "hero-detail", label: "Ảnh chi tiết" }],
    onCopyChange: () => {}, onSaveCopy: async () => {}, onUpload: async () => {},
  }));
  assert.match(html, /Vị trí ảnh/);
  assert.match(html, /value="hero-main"/);
  assert.match(html, /value="hero-detail"/);
  console.log("Homepage bootstrap contract passed: hidden fixed slots, missing-only initialization, no overwrite, denied write handling, copy-before-publication order, and initial media upload controls.");
} finally {
  await vite.close();
}
