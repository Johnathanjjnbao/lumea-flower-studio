import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseClient, requireSupabaseClient } from "../../lib/supabase";
import type { Database } from "../../types/database.generated";
import type { Locale } from "../../types/content";
import {
  emptyCommercialContentCopy,
  isCommercialContentCode,
  type CommercialContentCopy,
  type CommercialContentSection,
  type PublishedCommercialContent,
} from "./types";

type TranslationRow = Database["public"]["Tables"]["commercial_content_translations"]["Row"];

function copyFromRow(row: TranslationRow | undefined): CommercialContentCopy {
  return row ? { title: row.title, summary: row.summary, body: row.body } : emptyCommercialContentCopy();
}

function fail(message: string, error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : null;
  throw new Error(code ? `${message}:${code}` : message);
}

export class CommercialContentRepository {
  constructor(protected readonly client: SupabaseClient<Database> = requirePublicSupabaseClient()) {}

  async listPublished(locale: Locale): Promise<PublishedCommercialContent[]> {
    const sectionsResult = await this.client
      .from("commercial_content_sections")
      .select("id, code, sort_order")
      .eq("visibility", "PUBLISHED")
      .order("sort_order");
    if (sectionsResult.error) fail("COMMERCIAL_CONTENT_LOAD_FAILED", sectionsResult.error);

    const rows = (sectionsResult.data ?? []).flatMap((row) => isCommercialContentCode(row.code)
      ? [{ ...row, code: row.code }]
      : []);
    const ids = rows.map((row) => row.id);
    const translationsResult = ids.length
      ? await this.client
        .from("commercial_content_translations")
        .select("commercial_content_section_id, locale, title, summary, body, created_at, updated_at")
        .in("commercial_content_section_id", ids)
        .eq("locale", locale)
      : { data: [] as TranslationRow[], error: null };
    if (translationsResult.error) fail("COMMERCIAL_CONTENT_TRANSLATIONS_LOAD_FAILED", translationsResult.error);

    return rows.map((row) => {
      const translation = (translationsResult.data ?? []).find((item) => item.commercial_content_section_id === row.id);
      return {
        id: row.id,
        code: row.code,
        sortOrder: row.sort_order,
        content: translation && translation.title.trim() && translation.summary.trim() && translation.body.trim()
          ? { title: translation.title, summary: translation.summary, body: translation.body }
          : null,
      };
    });
  }
}

export class AdminCommercialContentRepository extends CommercialContentRepository {
  constructor(client: SupabaseClient<Database> = requireSupabaseClient()) { super(client); }

  async listAll(): Promise<CommercialContentSection[]> {
    const sectionsResult = await this.client
      .from("commercial_content_sections")
      .select("id, code, visibility, sort_order, updated_at")
      .order("sort_order");
    if (sectionsResult.error) fail("ADMIN_COMMERCIAL_CONTENT_LOAD_FAILED", sectionsResult.error);

    const rows = (sectionsResult.data ?? []).flatMap((row) => isCommercialContentCode(row.code)
      ? [{ ...row, code: row.code }]
      : []);
    const ids = rows.map((row) => row.id);
    const translationsResult = ids.length
      ? await this.client
        .from("commercial_content_translations")
        .select("commercial_content_section_id, locale, title, summary, body, created_at, updated_at")
        .in("commercial_content_section_id", ids)
      : { data: [] as TranslationRow[], error: null };
    if (translationsResult.error) fail("ADMIN_COMMERCIAL_CONTENT_TRANSLATIONS_LOAD_FAILED", translationsResult.error);

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      visibility: row.visibility === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
      vi: copyFromRow((translationsResult.data ?? []).find((item) => item.commercial_content_section_id === row.id && item.locale === "vi")),
      ko: copyFromRow((translationsResult.data ?? []).find((item) => item.commercial_content_section_id === row.id && item.locale === "ko")),
    }));
  }

  async save(section: CommercialContentSection, visibility: "DRAFT" | "PUBLISHED") {
    const { error } = await this.client.rpc("admin_save_commercial_content", {
      target_code: section.code,
      target_visibility: visibility,
      target_title_vi: section.vi.title,
      target_summary_vi: section.vi.summary,
      target_body_vi: section.vi.body,
      target_title_ko: section.ko.title,
      target_summary_ko: section.ko.summary,
      target_body_ko: section.ko.body,
    });
    if (error) fail("ADMIN_COMMERCIAL_CONTENT_SAVE_FAILED", error);
  }
}

export const createCommercialContentRepository = () => new CommercialContentRepository();
export const createAdminCommercialContentRepository = () => new AdminCommercialContentRepository();
