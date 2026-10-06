import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";
import type {
  AdminDeliverySettings,
  AdminDeliveryWindow,
  AdminDeliveryZone,
  AdminOperationsSnapshot,
  AdminPaymentSettings,
} from "./types";

export class AdminOperationsError extends Error {
  constructor(public readonly code: "STALE" | "INVARIANT" | "FAILED", message: string) {
    super(message);
    this.name = "AdminOperationsError";
  }
}

function fail(message: string, error: unknown): never {
  const detail = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (detail.includes("ADMIN_OPERATIONS_STALE")) throw new AdminOperationsError("STALE", message);
  if (detail.includes("ADMIN_DELIVERY_CONFIGURATION_INCOMPLETE") || detail.includes("ADMIN_SAME_DAY_CONFIGURATION_INCOMPLETE")) {
    throw new AdminOperationsError("INVARIANT", message);
  }
  throw new AdminOperationsError("FAILED", message);
}

function nullable(value: string) {
  return value.trim() || null;
}

export class AdminOperationsRepository {
  private readonly client: SupabaseClient<any>;

  constructor(client: SupabaseClient<any> = requireSupabaseClient() as SupabaseClient<any>) {
    this.client = client;
  }

  async getSnapshot(): Promise<AdminOperationsSnapshot> {
    const [deliveryResult, zonesResult, windowsResult, paymentResult] = await Promise.all([
      this.client.from("delivery_settings").select("*").eq("singleton", true).single(),
      this.client.from("delivery_zones").select("*, delivery_zone_translations(*), delivery_zone_areas(*)").order("sort_order").order("id"),
      this.client.from("delivery_windows").select("*").order("sort_order").order("id"),
      this.client.from("payment_settings").select("*").eq("singleton", true).single(),
    ]);
    const firstError = [deliveryResult.error, zonesResult.error, windowsResult.error, paymentResult.error].find(Boolean);
    if (firstError) fail("Không thể tải cấu hình vận hành", firstError);
    const delivery = deliveryResult.data;
    const payment = paymentResult.data;
    return {
      delivery: {
        updatedAt: delivery.updated_at,
        deliveryEnabled: delivery.delivery_enabled,
        pickupEnabled: delivery.pickup_enabled,
        sameDayEnabled: delivery.same_day_enabled,
        sameDayCutoff: delivery.same_day_cutoff?.slice(0, 5) ?? "",
        pickupNameVi: delivery.pickup_name_vi ?? "", pickupNameKo: delivery.pickup_name_ko ?? "",
        pickupAddressVi: delivery.pickup_address_vi ?? "", pickupAddressKo: delivery.pickup_address_ko ?? "",
        pickupHoursVi: delivery.pickup_hours_vi ?? "", pickupHoursKo: delivery.pickup_hours_ko ?? "",
        deliveryHelpVi: delivery.delivery_help_vi ?? "", deliveryHelpKo: delivery.delivery_help_ko ?? "",
      },
      zones: (zonesResult.data ?? []).map((zone: any) => ({
        id: zone.id, updatedAt: zone.updated_at, stableCode: zone.stable_code, feeAmount: zone.fee_amount, active: zone.active,
        sameDayEligible: zone.same_day_eligible, sortOrder: zone.sort_order,
        nameVi: zone.delivery_zone_translations.find((item: any) => item.locale === "vi")?.name ?? "",
        nameKo: zone.delivery_zone_translations.find((item: any) => item.locale === "ko")?.name ?? "",
        helpVi: zone.delivery_zone_translations.find((item: any) => item.locale === "vi")?.help_text ?? "",
        helpKo: zone.delivery_zone_translations.find((item: any) => item.locale === "ko")?.help_text ?? "",
        areas: zone.delivery_zone_areas.sort((a: any, b: any) => a.sort_order - b.sort_order).map((area: any) => ({
          id: area.id, stableCode: area.stable_code, nameVi: area.name_vi, nameKo: area.name_ko,
          active: area.active, sortOrder: area.sort_order,
        })),
      })),
      windows: (windowsResult.data ?? []).map((window: any) => ({
        id: window.id, updatedAt: window.updated_at, stableCode: window.stable_code, labelVi: window.label_vi, labelKo: window.label_ko,
        helpVi: window.help_vi ?? "", helpKo: window.help_ko ?? "", startTime: window.start_time.slice(0, 5),
        endTime: window.end_time.slice(0, 5), active: window.active,
        sameDayEligible: window.same_day_eligible, sortOrder: window.sort_order,
      })),
      payment: {
        updatedAt: payment.updated_at,
        bankTransferEnabled: payment.bank_transfer_enabled, cashEnabled: payment.cash_enabled,
        cashDeliveryEnabled: payment.cash_delivery_enabled, cashPickupEnabled: payment.cash_pickup_enabled,
        bankId: payment.bank_id ?? "", bankName: payment.bank_name ?? "", accountNumber: payment.account_number ?? "",
        accountHolder: payment.account_holder ?? "", vietqrTemplate: payment.vietqr_template ?? "",
        transferReferenceTemplate: payment.transfer_reference_template ?? "",
        paymentDeadlineHours: payment.payment_deadline_hours,
        bankInstructionsVi: payment.bank_instructions_vi ?? "", bankInstructionsKo: payment.bank_instructions_ko ?? "",
        cashInstructionsVi: payment.cash_instructions_vi ?? "", cashInstructionsKo: payment.cash_instructions_ko ?? "",
      },
    };
  }

  async saveDelivery(settings: AdminDeliverySettings) {
    const { error } = await this.client.rpc("admin_save_delivery_settings", {
      expected_updated_at: settings.updatedAt,
      next_delivery_enabled: settings.deliveryEnabled,
      next_pickup_enabled: settings.pickupEnabled,
      next_same_day_enabled: settings.sameDayEnabled,
      next_same_day_cutoff: nullable(settings.sameDayCutoff),
      next_pickup_name_vi: settings.pickupNameVi,
      next_pickup_name_ko: settings.pickupNameKo,
      next_pickup_address_vi: settings.pickupAddressVi,
      next_pickup_address_ko: settings.pickupAddressKo,
      next_pickup_hours_vi: settings.pickupHoursVi,
      next_pickup_hours_ko: settings.pickupHoursKo,
      next_delivery_help_vi: settings.deliveryHelpVi,
      next_delivery_help_ko: settings.deliveryHelpKo,
    });
    if (error) fail("Không thể lưu cấu hình giao nhận", error);
  }

  async savePayment(settings: AdminPaymentSettings) {
    const { error } = await this.client.rpc("admin_save_payment_settings", {
      expected_updated_at: settings.updatedAt,
      next_bank_transfer_enabled: settings.bankTransferEnabled,
      next_cash_enabled: settings.cashEnabled,
      next_cash_delivery_enabled: settings.cashDeliveryEnabled,
      next_cash_pickup_enabled: settings.cashPickupEnabled,
      next_bank_id: settings.bankId,
      next_bank_name: settings.bankName,
      next_account_number: settings.accountNumber,
      next_account_holder: settings.accountHolder,
      next_vietqr_template: settings.vietqrTemplate,
      next_transfer_reference_template: settings.transferReferenceTemplate,
      next_payment_deadline_hours: settings.paymentDeadlineHours,
      next_bank_instructions_vi: settings.bankInstructionsVi,
      next_bank_instructions_ko: settings.bankInstructionsKo,
      next_cash_instructions_vi: settings.cashInstructionsVi,
      next_cash_instructions_ko: settings.cashInstructionsKo,
    });
    if (error) fail("Không thể lưu cấu hình thanh toán", error);
  }

  async saveZone(zone: AdminDeliveryZone) {
    const { error } = await this.client.rpc("admin_save_delivery_zone_v15", {
      target_zone_id: zone.id,
      expected_updated_at: zone.updatedAt,
      zone_stable_code: zone.stableCode.trim(),
      zone_name_vi: zone.nameVi.trim(),
      zone_name_ko: zone.nameKo.trim(),
      zone_help_vi: zone.helpVi.trim(),
      zone_help_ko: zone.helpKo.trim(),
      zone_fee_amount: zone.feeAmount,
      zone_active: zone.active,
      zone_same_day_eligible: zone.sameDayEligible,
      zone_sort_order: zone.sortOrder,
      zone_areas: zone.areas.map((area) => ({
        id: area.id,
        stable_code: area.stableCode.trim(),
        name_vi: area.nameVi.trim(),
        name_ko: area.nameKo.trim(),
        active: area.active,
        sort_order: area.sortOrder,
      })),
    });
    if (error) fail("Không thể lưu zone", error);
  }

  async saveWindow(window: AdminDeliveryWindow) {
    const { error } = await this.client.rpc("admin_save_delivery_window", {
      target_window_id: window.id,
      expected_updated_at: window.updatedAt,
      window_stable_code: window.stableCode.trim(),
      window_label_vi: window.labelVi.trim(),
      window_label_ko: window.labelKo.trim(),
      window_help_vi: window.helpVi,
      window_help_ko: window.helpKo,
      window_start_time: window.startTime,
      window_end_time: window.endTime,
      window_active: window.active,
      window_same_day_eligible: window.sameDayEligible,
      window_sort_order: window.sortOrder,
    });
    if (error) fail("Không thể lưu khung giờ", error);
  }
}

export function createAdminOperationsRepository() {
  return new AdminOperationsRepository();
}
