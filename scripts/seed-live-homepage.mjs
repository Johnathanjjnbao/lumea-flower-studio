import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { createServer } from "vite";

const EXPECTED_PROJECT_REF = "nihhynwvltttadlfatdm";
const SEED_NAMESPACE = "lumea-live-homepage-v1";
const REPOSITORY_ROOT = process.cwd();
const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/avif", "avif"],
]);

function run(command, args, cwd = REPOSITORY_ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve(stdout.trim())
      : reject(new Error(`${command} exited with ${code}: ${[stderr.trim(), stdout.trim()].filter(Boolean).join("\n")}`)));
  });
}

const npx = (...args) => process.platform === "win32"
  ? run(process.execPath, [join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"), ...args])
  : run("npx", args);
const npxFrom = (cwd, ...args) => process.platform === "win32"
  ? run(process.execPath, [join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"), ...args], cwd)
  : run("npx", args, cwd);

function deterministicUuid(key) {
  const bytes = createHash("sha256").update(`${SEED_NAMESPACE}:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function verifyLinkedProject() {
  const projects = JSON.parse(await npx("supabase", "projects", "list", "--output", "json"));
  const linked = projects.find((project) => project.linked);
  if (!linked || linked.ref !== EXPECTED_PROJECT_REF || linked.name !== "lumea-flower-studio") {
    throw new Error(`Refusing to seed unexpected linked project: ${linked?.ref ?? "none"}.`);
  }
}

async function loadFixture() {
  const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  try {
    const [{ assets }, { occasions, budgetRanges, products }, { vi }, { ko }] = await Promise.all([
      vite.ssrLoadModule("/src/data/assets.ts"),
      vite.ssrLoadModule("/src/data/content.ts"),
      vite.ssrLoadModule("/src/i18n/vi.ts"),
      vite.ssrLoadModule("/src/i18n/ko.ts"),
    ]);
    return { assets, occasions, budgetRanges, products, dictionaries: { vi, ko } };
  } finally {
    await vite.close();
  }
}

async function listUploadedObjects() {
  const output = await npx("supabase", "--experimental", "storage", "ls", "-r", "ss:///public-media/homepage", "--linked", "--output-format", "json");
  const result = JSON.parse(output);
  return new Set((result.paths ?? []).map((path) => path.replace(/^\/public-media\//, "")));
}

async function downloadImage(sourceUrl, destinationBase) {
  const response = await fetch(sourceUrl, { headers: { "user-agent": "LumeaHomepageMigration/1.0" }, redirect: "follow" });
  if (!response.ok) throw new Error(`Unable to download current Homepage image (${response.status}) from ${new URL(sourceUrl).hostname}.`);
  const mimeType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  const extension = mimeType ? ALLOWED_MIME_TYPES.get(mimeType) : undefined;
  if (!mimeType || !extension) throw new Error(`Unsupported Homepage image type: ${mimeType ?? "unknown"}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("Downloaded Homepage image is empty.");
  const filePath = `${destinationBase}.${extension}`;
  await writeFile(filePath, bytes);
  return { byteSize: bytes.length, checksum: createHash("sha256").update(bytes).digest("hex"), extension, filePath, mimeType };
}

function sectionCopy(dictionary, key) {
  const home = dictionary.home;
  const copies = {
    hero: { eyebrow: home.hero.kicker, titleOne: home.hero.titleOne, titleTwo: home.hero.titleTwo, body: home.hero.intro, note: "", primaryCta: home.hero.collectionCta, secondaryCta: home.hero.customCta, secondaryHeading: "", secondaryBody: "", detailOneLabel: home.hero.commerceBefore, detailOneValue: "450.000đ", detailTwoLabel: home.hero.commerceAfter, detailTwoValue: "" },
    occasions: { eyebrow: home.occasions.eyebrow, titleOne: home.occasions.titleOne, titleTwo: home.occasions.titleTwo, body: home.occasions.intro },
    best_sellers: { eyebrow: home.best.eyebrow, titleOne: home.best.titleOne, titleTwo: home.best.titleTwo, note: home.best.empty, primaryCta: home.best.viewAll },
    budget: { eyebrow: home.budget.eyebrow, titleOne: home.budget.titleOne, titleTwo: home.budget.titleTwo, body: home.budget.intro },
    same_day: { eyebrow: home.sameDay.eyebrow, titleOne: home.sameDay.titleOne, titleTwo: home.sameDay.titleTwo, body: home.sameDay.intro, note: home.sameDay.note, primaryCta: home.sameDay.cta },
    florist_choice: { eyebrow: home.florist.eyebrow, titleOne: home.florist.titleOne, titleTwo: home.florist.titleTwo, body: home.florist.intro, primaryCta: home.florist.cta },
    create_bouquet: { eyebrow: home.custom.eyebrow, titleOne: home.custom.titleOne, titleTwo: home.custom.titleTwo, body: home.custom.intro, primaryCta: home.custom.cta, secondaryCta: home.custom.assistCta, secondaryHeading: home.custom.assistTitle, secondaryBody: home.custom.assistText },
    why_lumea: { eyebrow: home.why.eyebrow, titleOne: home.why.titleOne, titleTwo: home.why.titleTwo, body: home.why.intro },
    gallery: { eyebrow: home.gallery.eyebrow, titleOne: home.gallery.titleOne, titleTwo: home.gallery.titleTwo, primaryCta: home.gallery.follow },
    visit: { eyebrow: home.visit.eyebrow, titleOne: home.visit.title, body: home.visit.lead, detailOneLabel: home.visit.address, detailOneValue: home.visit.addressValue, detailTwoLabel: home.visit.hours, detailTwoValue: home.visit.hoursValue },
  };
  return copies[key];
}

function buildFixture({ assets, occasions, budgetRanges, products, dictionaries }) {
  const sectionDefs = [
    ["hero", 10, "#best-sellers", "#custom"], ["occasions", 20, null, null], ["best_sellers", 30, "/flowers", null],
    ["budget", 40, null, null], ["same_day", 50, "/flowers?sameDay=true", null], ["florist_choice", 60, "#florist-choice", null],
    ["create_bouquet", 70, "/create-bouquet", "#florist-choice"], ["why_lumea", 80, null, null], ["gallery", 90, "#visit", null], ["visit", 100, null, null],
  ].map(([key, order, primary, secondary]) => ({ key, order, primary, secondary, id: deterministicUuid(`section:${key}`) }));

  const mediaDefs = [
    { section: "hero", slot: "hero-main", asset: "heroMain", viAlt: dictionaries.vi.home.hero.mainAlt, koAlt: dictionaries.ko.home.hero.mainAlt, viCaption: `${dictionaries.vi.home.hero.captionOne} · ${dictionaries.vi.home.hero.captionTwo}`, koCaption: `${dictionaries.ko.home.hero.captionOne} · ${dictionaries.ko.home.hero.captionTwo}` },
    { section: "hero", slot: "hero-detail", asset: "heroDetail", viAlt: dictionaries.vi.home.hero.detailAlt, koAlt: dictionaries.ko.home.hero.detailAlt },
    ...occasions.map((occasion, index) => ({ section: "occasions", slot: `occasion-${occasion.id}`, asset: occasion.image, sortOrder: index * 10, viAlt: dictionaries.vi.occasions[occasion.id].alt, koAlt: dictionaries.ko.occasions[occasion.id].alt })),
    ...budgetRanges.map((range, index) => ({ section: "budget", slot: `budget-${range.id}`, asset: range.image, sortOrder: index * 10, viAlt: dictionaries.vi.budgets[range.id].alt, koAlt: dictionaries.ko.budgets[range.id].alt })),
    { section: "same_day", slot: "same-day-main", asset: "deliveryReady", viAlt: dictionaries.vi.home.sameDay.imageAlt, koAlt: dictionaries.ko.home.sameDay.imageAlt, viCaption: dictionaries.vi.home.sameDay.caption, koCaption: dictionaries.ko.home.sameDay.caption },
    { section: "florist_choice", slot: "florist-main", asset: "studioTable", viAlt: dictionaries.vi.home.florist.imageAlt, koAlt: dictionaries.ko.home.florist.imageAlt, viCaption: dictionaries.vi.home.florist.imageCaption, koCaption: dictionaries.ko.home.florist.imageCaption },
    { section: "create_bouquet", slot: "custom-main", asset: "studioFlorist", viAlt: dictionaries.vi.home.custom.imageAlt, koAlt: dictionaries.ko.home.custom.imageAlt, viCaption: dictionaries.vi.home.custom.imageCaption, koCaption: dictionaries.ko.home.custom.imageCaption },
  ];
  const galleryAssets = ["galleryOne", "studioRibbon", "galleryThree", "galleryFour", "singleRose", "galleryFive", "customBouquet", "whyLumea", "galleryTwo", "gallerySix"];
  galleryAssets.forEach((asset, index) => mediaDefs.push({
    section: "gallery", slot: `gallery-${String(index + 1).padStart(2, "0")}`, asset, sortOrder: index * 10,
    viAlt: dictionaries.vi.home.gallery.alts[index], koAlt: dictionaries.ko.home.gallery.alts[index],
    viCaption: ({ 0: dictionaries.vi.home.gallery.captions[0], 5: dictionaries.vi.home.gallery.captions[1], 9: dictionaries.vi.home.gallery.captions[2] })[index],
    koCaption: ({ 0: dictionaries.ko.home.gallery.captions[0], 5: dictionaries.ko.home.gallery.captions[1], 9: dictionaries.ko.home.gallery.captions[2] })[index],
  }));
  const featureAssets = ["flowerShop", "floristHands", "wrappingDetail"];
  const featureDefs = featureAssets.map((asset, index) => ({
    section: "why_lumea", itemKey: ["fresh-daily", "made-by-hand", "given-with-care"][index], asset, sortOrder: index * 10,
    vi: dictionaries.vi.home.why.stories[index], ko: dictionaries.ko.home.why.stories[index],
  }));

  return { assets, dictionaries, sectionDefs, mediaDefs, featureDefs, featuredCodes: products.filter((product) => product.featured).map((product) => product.id).slice(0, 6) };
}

function buildSeedSql(fixture, mediaRecords, featureRecords) {
  const sectionValues = fixture.sectionDefs.map((section) => `(${sql(section.id)}, ${sql(section.key)}, true, ${section.order}, ${sql(section.primary)}, ${sql(section.secondary)})`).join(",\n");
  const translationValues = fixture.sectionDefs.flatMap((section) => ["vi", "ko"].map((locale) => {
    const copy = sectionCopy(fixture.dictionaries[locale], section.key);
    return `(${sql(section.key)}, ${sql(locale)}, ${sql(copy.eyebrow)}, ${sql(copy.titleOne)}, ${sql(copy.titleTwo)}, ${sql(copy.body)}, ${sql(copy.note)}, ${sql(copy.primaryCta)}, ${sql(copy.secondaryCta)}, ${sql(copy.secondaryHeading)}, ${sql(copy.secondaryBody)}, ${sql(copy.detailOneLabel)}, ${sql(copy.detailOneValue)}, ${sql(copy.detailTwoLabel)}, ${sql(copy.detailTwoValue)})`;
  })).join(",\n");
  const allMedia = [...mediaRecords, ...featureRecords];
  const mediaValues = allMedia.map((record) => `(${sql(record.mediaId)}, 'public-media', ${sql(record.storagePath)}, 'PUBLIC', ${sql(record.image.mimeType)}, ${record.image.byteSize}, ${sql(record.image.checksum)}, 'ACTIVE')`).join(",\n");
  const mediaTranslationValues = allMedia.flatMap((record) => [
    `(${sql(record.mediaId)}, 'vi', ${sql(record.viAlt)}, ${sql(record.viCaption)})`,
    `(${sql(record.mediaId)}, 'ko', ${sql(record.koAlt)}, ${sql(record.koCaption)})`,
  ]).join(",\n");
  const placementValues = mediaRecords.map((record) => `(${sql(record.placementId)}, ${sql(record.section)}, ${sql(record.mediaId)}, ${sql(record.slot)}, ${record.sortOrder ?? 0})`).join(",\n");
  const featureValues = featureRecords.map((record) => `(${sql(record.featureId)}, ${sql(record.section)}, ${sql(record.itemKey)}, ${sql(record.mediaId)}, ${record.sortOrder})`).join(",\n");
  const featureTranslationValues = featureRecords.flatMap((record) => ["vi", "ko"].map((locale) => {
    const copy = record[locale];
    return `(${sql(record.featureId)}, ${sql(locale)}, ${sql(copy.label)}, ${sql(copy.title)}, ${sql(copy.text)})`;
  })).join(",\n");
  const curationValues = fixture.featuredCodes.map((code, index) => `(${sql(code)}, ${index * 10})`).join(",\n");

  return `begin;
insert into public.homepage_sections (id, section_key, enabled, display_order, primary_cta_target, secondary_cta_target)
values ${sectionValues} on conflict (section_key) do nothing;

insert into public.homepage_section_translations (homepage_section_id, locale, eyebrow, title_line_one, title_line_two, body, note, primary_cta_label, secondary_cta_label, secondary_heading, secondary_body, detail_one_label, detail_one_value, detail_two_label, detail_two_value)
select section.id, source.locale::public.locale_code, source.eyebrow, source.title_one, source.title_two, source.body, source.note, source.primary_cta, source.secondary_cta, source.secondary_heading, source.secondary_body, source.detail_one_label, source.detail_one_value, source.detail_two_label, source.detail_two_value
from (values ${translationValues}) as source(section_key, locale, eyebrow, title_one, title_two, body, note, primary_cta, secondary_cta, secondary_heading, secondary_body, detail_one_label, detail_one_value, detail_two_label, detail_two_value)
join public.homepage_sections section on section.section_key = source.section_key
on conflict (homepage_section_id, locale) do nothing;

insert into public.media_assets (id, storage_bucket, storage_path, access, mime_type, byte_size, checksum, status)
values ${mediaValues} on conflict (storage_bucket, storage_path) do nothing;
insert into public.media_asset_translations (media_asset_id, locale, alt_text, caption)
values ${mediaTranslationValues} on conflict (media_asset_id, locale) do nothing;

insert into public.homepage_section_media (id, homepage_section_id, media_asset_id, slot_key, sort_order, active)
select source.id::uuid, section.id, source.media_id::uuid, source.slot_key, source.sort_order, true
from (values ${placementValues}) as source(id, section_key, media_id, slot_key, sort_order)
join public.homepage_sections section on section.section_key = source.section_key
on conflict (homepage_section_id, slot_key) do nothing;

insert into public.homepage_feature_items (id, homepage_section_id, item_key, media_asset_id, sort_order, active)
select source.id::uuid, section.id, source.item_key, source.media_id::uuid, source.sort_order, true
from (values ${featureValues}) as source(id, section_key, item_key, media_id, sort_order)
join public.homepage_sections section on section.section_key = source.section_key
on conflict (homepage_section_id, item_key) do nothing;
insert into public.homepage_feature_item_translations (homepage_feature_item_id, locale, label, title, body)
values ${featureTranslationValues} on conflict (homepage_feature_item_id, locale) do nothing;

insert into public.homepage_product_curations (homepage_section_id, product_id, sort_order, active)
select section.id, product.id, source.sort_order, true
from (values ${curationValues}) as source(stable_code, sort_order)
join public.homepage_sections section on section.section_key = 'best_sellers'
join public.products product on product.stable_code = source.stable_code and product.visibility = 'PUBLISHED' and product.archived_at is null
on conflict (homepage_section_id, product_id) do nothing;
commit;
select (select count(*) from public.homepage_sections) as sections,
  (select count(*) from public.homepage_section_media where active) as media_slots,
  (select count(*) from public.homepage_product_curations where active) as curated_products;
`;
}

async function main() {
  await verifyLinkedProject();
  const fixture = buildFixture(await loadFixture());
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "lumea-homepage-seed-"));
  try {
    const uploadedObjects = await listUploadedObjects();
    const prepare = async (definition, kind) => {
      const identity = kind === "feature" ? `${definition.section}:${definition.itemKey}` : `${definition.section}:${definition.slot}`;
      const mediaId = deterministicUuid(`media:${identity}`);
      const image = await downloadImage(fixture.assets[definition.asset], join(temporaryDirectory, mediaId));
      await stat(image.filePath);
      const storagePath = `homepage/${definition.section}/${mediaId}.${image.extension}`;
      if (!uploadedObjects.has(storagePath)) {
        await npxFrom(temporaryDirectory, "supabase", "--workdir", REPOSITORY_ROOT, "--experimental", "storage", "cp", basename(image.filePath), `ss:///public-media/${storagePath}`, "--linked", "--content-type", image.mimeType, "--cache-control", "public, max-age=31536000, immutable");
      }
      return {
        ...definition, image, mediaId, storagePath,
        placementId: deterministicUuid(`placement:${identity}`),
        featureId: deterministicUuid(`feature:${identity}`),
        viCaption: definition.viCaption ?? null, koCaption: definition.koCaption ?? null,
        viAlt: definition.viAlt ?? definition.vi.alt, koAlt: definition.koAlt ?? definition.ko.alt,
      };
    };
    const mediaRecords = [];
    for (const definition of fixture.mediaDefs) mediaRecords.push(await prepare(definition, "media"));
    const featureRecords = [];
    for (const definition of fixture.featureDefs) featureRecords.push(await prepare(definition, "feature"));
    const sqlPath = join(temporaryDirectory, "homepage-seed.sql");
    await writeFile(sqlPath, buildSeedSql(fixture, mediaRecords, featureRecords), "utf8");
    const result = await npx("supabase", "db", "query", "--linked", "--file", sqlPath, "--output-format", "json");
    console.log(`Seeded ${fixture.sectionDefs.length} fixed Homepage sections and ${mediaRecords.length + featureRecords.length} managed images into ${EXPECTED_PROJECT_REF}.`);
    console.log(result);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
