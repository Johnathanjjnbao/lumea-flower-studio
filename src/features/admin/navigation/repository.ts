import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";
import type { NavigationDestinationType } from "../../navigation/types";

export interface AdminNavigationItem {
  id?: string;
  stableCode: string;
  destinationType: NavigationDestinationType;
  categoryId: string | null;
  externalUrl: string;
  active: boolean;
  sortOrder: number;
  viLabel: string;
  koLabel: string;
}

export interface AdminNavigationSnapshot {
  items: AdminNavigationItem[];
  categories: Array<{ id: string; name: string }>;
}

export function emptyAdminNavigationItem(sortOrder = 0): AdminNavigationItem {
  return { stableCode: "", destinationType: "CATALOG", categoryId: null, externalUrl: "", active: true, sortOrder, viLabel: "", koLabel: "" };
}

function fail(error: unknown): never {
  const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : "ADMIN_NAVIGATION_FAILED";
  throw new Error(message);
}

export class AdminNavigationRepository {
  constructor(private readonly client: SupabaseClient<any> = requireSupabaseClient() as SupabaseClient<any>) {}
  async getSnapshot(): Promise<AdminNavigationSnapshot> {
    const [itemsResult, categoriesResult] = await Promise.all([
      this.client.from("navigation_items").select("id, stable_code, destination_type, category_id, external_url, active, sort_order, navigation_item_translations(locale, label)").order("sort_order"),
      this.client.from("categories").select("id, category_translations(locale, name)").neq("visibility", "ARCHIVED").order("sort_order"),
    ]);
    if (itemsResult.error) fail(itemsResult.error);
    if (categoriesResult.error) fail(categoriesResult.error);
    return {
      items: (itemsResult.data ?? []).map((row: any) => ({
        id: row.id,
        stableCode: row.stable_code,
        destinationType: row.destination_type,
        categoryId: row.category_id,
        externalUrl: row.external_url ?? "",
        active: row.active,
        sortOrder: row.sort_order,
        viLabel: row.navigation_item_translations.find((value: any) => value.locale === "vi")?.label ?? "",
        koLabel: row.navigation_item_translations.find((value: any) => value.locale === "ko")?.label ?? "",
      })),
      categories: (categoriesResult.data ?? []).map((row: any) => ({ id: row.id, name: row.category_translations.find((value: any) => value.locale === "vi")?.name ?? row.id })),
    };
  }
  async save(item: AdminNavigationItem) {
    const { error } = await this.client.rpc("admin_save_navigation_item", {
      target_id: item.id ?? null,
      target_stable_code: item.stableCode,
      target_destination_type: item.destinationType,
      target_category_id: item.destinationType === "CATEGORY" ? item.categoryId : null,
      target_external_url: item.destinationType === "EXTERNAL" ? item.externalUrl : null,
      target_active: item.active,
      target_sort_order: item.sortOrder,
      target_label_vi: item.viLabel,
      target_label_ko: item.koLabel,
    });
    if (error) fail(error);
  }
  async remove(id: string) { const { error } = await this.client.rpc("admin_delete_navigation_item", { target_id: id }); if (error) fail(error); }
  async reorder(ids: string[]) { const { error } = await this.client.rpc("admin_reorder_navigation", { target_ids: ids }); if (error) fail(error); }
}

export const createAdminNavigationRepository = () => new AdminNavigationRepository();
