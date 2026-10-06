import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";

export interface AdminDiscoveryItem {
  id: string;
  stableCode: string;
  active: boolean;
  sortOrder: number;
  minAmount?: number;
  maxAmount?: number | null;
  vi: { label: string; scale: string; description: string };
  ko: { label: string; scale: string; description: string };
}

export interface AdminDiscoverySnapshot {
  occasions: AdminDiscoveryItem[];
  budgets: AdminDiscoveryItem[];
}

export type AdminDiscoveryErrorCode = "LABEL_REQUIRED" | "SORT_ORDER" | "MIN_AMOUNT" | "MAX_AMOUNT" | "FAILED";

export class AdminDiscoveryError extends Error {
  constructor(public readonly code: AdminDiscoveryErrorCode) {
    super(`ADMIN_DISCOVERY_${code}`);
    this.name = "AdminDiscoveryError";
  }
}

export class AdminDiscoveryRepository {
  constructor(private readonly client: SupabaseClient<any> = requireSupabaseClient() as SupabaseClient<any>) {}

  async getSnapshot(): Promise<AdminDiscoverySnapshot> {
    const [occasionResult, budgetResult] = await Promise.all([
      this.client.from("occasions").select("id, stable_code, visibility, sort_order, occasion_translations(locale, name, description)").neq("visibility", "ARCHIVED").order("sort_order"),
      this.client.from("budget_ranges").select("id, stable_code, min_amount, max_amount, visibility, sort_order, budget_range_translations(locale, scale_label, label, description)").neq("visibility", "ARCHIVED").order("sort_order"),
    ]);
    if (occasionResult.error || budgetResult.error) throw new AdminDiscoveryError("FAILED");
    const localized = (rows: any[], locale: "vi" | "ko", labelKey: "name" | "label") => {
      const row = rows.find((item) => item.locale === locale);
      return { label: row?.[labelKey] ?? "", scale: row?.scale_label ?? "", description: row?.description ?? "" };
    };
    return {
      occasions: (occasionResult.data ?? []).map((row: any) => ({ id: row.id, stableCode: row.stable_code, active: row.visibility === "PUBLISHED", sortOrder: row.sort_order, vi: localized(row.occasion_translations, "vi", "name"), ko: localized(row.occasion_translations, "ko", "name") })),
      budgets: (budgetResult.data ?? []).map((row: any) => ({ id: row.id, stableCode: row.stable_code, active: row.visibility === "PUBLISHED", sortOrder: row.sort_order, minAmount: Number(row.min_amount), maxAmount: row.max_amount === null ? null : Number(row.max_amount), vi: localized(row.budget_range_translations, "vi", "label"), ko: localized(row.budget_range_translations, "ko", "label") })),
    };
  }

  async saveOccasion(item: AdminDiscoveryItem) {
    this.validate(item, false);
    const visibility = item.active ? "PUBLISHED" : "HIDDEN";
    const state = await this.client.from("occasions").update({ visibility, sort_order: item.sortOrder, published_at: item.active ? new Date().toISOString() : undefined }).eq("id", item.id);
    if (state.error) throw new AdminDiscoveryError("FAILED");
    const copy = await this.client.from("occasion_translations").upsert([
      { occasion_id: item.id, locale: "vi", name: item.vi.label.trim(), description: item.vi.description.trim() || null },
      { occasion_id: item.id, locale: "ko", name: item.ko.label.trim(), description: item.ko.description.trim() || null },
    ], { onConflict: "occasion_id,locale" });
    if (copy.error) throw new AdminDiscoveryError("FAILED");
  }

  async saveBudget(item: AdminDiscoveryItem) {
    this.validate(item, true);
    const visibility = item.active ? "PUBLISHED" : "HIDDEN";
    const state = await this.client.from("budget_ranges").update({ min_amount: item.minAmount, max_amount: item.maxAmount, visibility, sort_order: item.sortOrder, published_at: item.active ? new Date().toISOString() : undefined }).eq("id", item.id);
    if (state.error) throw new AdminDiscoveryError("FAILED");
    const copy = await this.client.from("budget_range_translations").upsert([
      { budget_range_id: item.id, locale: "vi", scale_label: item.vi.scale.trim() || null, label: item.vi.label.trim(), description: item.vi.description.trim() || null },
      { budget_range_id: item.id, locale: "ko", scale_label: item.ko.scale.trim() || null, label: item.ko.label.trim(), description: item.ko.description.trim() || null },
    ], { onConflict: "budget_range_id,locale" });
    if (copy.error) throw new AdminDiscoveryError("FAILED");
  }

  private validate(item: AdminDiscoveryItem, budget: boolean) {
    if (!item.vi.label.trim() || !item.ko.label.trim()) throw new AdminDiscoveryError("LABEL_REQUIRED");
    if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0) throw new AdminDiscoveryError("SORT_ORDER");
    if (budget) {
      if (!Number.isSafeInteger(item.minAmount) || (item.minAmount ?? -1) < 0) throw new AdminDiscoveryError("MIN_AMOUNT");
      if (item.maxAmount !== null && (!Number.isSafeInteger(item.maxAmount) || item.maxAmount! < item.minAmount!)) throw new AdminDiscoveryError("MAX_AMOUNT");
    }
  }
}

export const createAdminDiscoveryRepository = () => new AdminDiscoveryRepository();
