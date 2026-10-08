import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";

export interface AdminCategory {
  id?: string;
  stableCode: string;
  slug: string;
  active: boolean;
  sortOrder: number;
  productCount: number;
  vi: { name: string; description: string };
  ko: { name: string; description: string };
}

export class AdminCategoryError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

function fail(error: unknown): never {
  const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
    ? error.message
    : "ADMIN_CATEGORY_FAILED";
  throw new AdminCategoryError(message);
}

export function emptyAdminCategory(sortOrder = 0): AdminCategory {
  return {
    stableCode: "",
    slug: "",
    active: false,
    sortOrder,
    productCount: 0,
    vi: { name: "", description: "" },
    ko: { name: "", description: "" },
  };
}

export class AdminCategoryRepository {
  constructor(private readonly client: SupabaseClient<any> = requireSupabaseClient() as SupabaseClient<any>) {}

  async list(): Promise<AdminCategory[]> {
    const { data, error } = await this.client
      .from("categories")
      .select("id, stable_code, slug, visibility, sort_order, category_translations(locale, name, description), products(count)")
      .neq("visibility", "ARCHIVED")
      .order("sort_order");
    if (error) fail(error);
    return (data ?? []).map((row: any) => {
      const localized = (locale: "vi" | "ko") => row.category_translations.find((item: any) => item.locale === locale);
      return {
        id: row.id,
        stableCode: row.stable_code,
        slug: row.slug,
        active: row.visibility === "PUBLISHED",
        sortOrder: row.sort_order,
        productCount: row.products?.[0]?.count ?? 0,
        vi: { name: localized("vi")?.name ?? "", description: localized("vi")?.description ?? "" },
        ko: { name: localized("ko")?.name ?? "", description: localized("ko")?.description ?? "" },
      };
    });
  }

  async save(category: AdminCategory) {
    const { data, error } = await this.client.rpc("admin_save_category", {
      target_id: category.id ?? null,
      target_stable_code: category.stableCode,
      target_slug: category.slug,
      target_active: category.active,
      target_sort_order: category.sortOrder,
      target_name_vi: category.vi.name,
      target_name_ko: category.ko.name,
      target_description_vi: category.vi.description || null,
      target_description_ko: category.ko.description || null,
    });
    if (error) fail(error);
    return data as string;
  }

  async archive(categoryId: string) {
    const { error } = await this.client.rpc("admin_archive_category", { target_id: categoryId });
    if (error) fail(error);
  }

  async reorder(categoryIds: string[]) {
    const { error } = await this.client.rpc("admin_reorder_categories", { target_ids: categoryIds });
    if (error) fail(error);
  }
}

export const createAdminCategoryRepository = () => new AdminCategoryRepository();
