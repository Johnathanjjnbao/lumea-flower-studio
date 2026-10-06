import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseClient } from "../../lib/supabase";
import type { Locale } from "../../types/content";
import type { DiscoveryOptions } from "./types";

export class DiscoveryRepository {
  constructor(private readonly client: SupabaseClient<any> = requirePublicSupabaseClient() as SupabaseClient<any>) {}

  async getOptions(locale: Locale): Promise<DiscoveryOptions> {
    const [occasionResult, budgetResult] = await Promise.all([
      this.client.from("occasions").select("id, stable_code, sort_order, occasion_translations!inner(locale, name, description)").eq("visibility", "PUBLISHED").is("archived_at", null).eq("occasion_translations.locale", locale).order("sort_order"),
      this.client.from("budget_ranges").select("id, stable_code, min_amount, max_amount, sort_order, budget_range_translations!inner(locale, scale_label, label, description)").eq("visibility", "PUBLISHED").is("archived_at", null).eq("budget_range_translations.locale", locale).order("sort_order"),
    ]);
    if (occasionResult.error) throw new Error(`DISCOVERY_OCCASIONS_LOAD_FAILED:${occasionResult.error.code}`);
    if (budgetResult.error) throw new Error(`DISCOVERY_BUDGETS_LOAD_FAILED:${budgetResult.error.code}`);
    return {
      occasions: (occasionResult.data ?? []).map((row: any) => ({
        id: row.id,
        stableCode: row.stable_code,
        name: row.occasion_translations[0]?.name ?? row.stable_code,
        description: row.occasion_translations[0]?.description ?? "",
        sortOrder: row.sort_order,
      })),
      budgetRanges: (budgetResult.data ?? []).map((row: any) => ({
        id: row.id,
        stableCode: row.stable_code,
        minAmount: Number(row.min_amount),
        maxAmount: row.max_amount === null ? null : Number(row.max_amount),
        scaleLabel: row.budget_range_translations[0]?.scale_label ?? "",
        label: row.budget_range_translations[0]?.label ?? row.stable_code,
        description: row.budget_range_translations[0]?.description ?? "",
        sortOrder: row.sort_order,
      })),
    };
  }
}
