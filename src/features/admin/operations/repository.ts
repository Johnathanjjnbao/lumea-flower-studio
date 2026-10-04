import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";
import type {
  AdminDeliverySettings,
  AdminDeliveryWindow,
  AdminDeliveryZone,
  AdminOperationsSnapshot,
  AdminPaymentSettings,
} from "./types";

function fail(message: string, error: unknown): never {
  const detail = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  throw new Error([message, detail].filter(Boolean).join(" · "));
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
        id: zone.id, stableCode: zone.stable_code, feeAmount: zone.fee_amount, active: zone.active,
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
        id: window.id, stableCode: window.stable_code, labelVi: window.label_vi, labelKo: window.label_ko,
        helpVi: window.help_vi ?? "", helpKo: window.help_ko ?? "", startTime: window.start_time.slice(0, 5),
        endTime: window.end_time.slice(0, 5), active: window.active,
        sameDayEligible: window.same_day_eligible, sortOrder: window.sort_order,
      })),
      payment: {
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
    const { error } = await this.client.from("delivery_settings").update({
      delivery_enabled: settings.deliveryEnabled, pickup_enabled: settings.pickupEnabled,
      same_day_enabled: settings.sameDayEnabled, same_day_cutoff: nullable(settings.sameDayCutoff),
      pickup_name_vi: nullable(settings.pickupNameVi), pickup_name_ko: nullable(settings.pickupNameKo),
      pickup_address_vi: nullable(settings.pickupAddressVi), pickup_address_ko: nullable(settings.pickupAddressKo),
      pickup_hours_vi: nullable(settings.pickupHoursVi), pickup_hours_ko: nullable(settings.pickupHoursKo),
      delivery_help_vi: nullable(settings.deliveryHelpVi), delivery_help_ko: nullable(settings.deliveryHelpKo),
    }).eq("singleton", true).select("singleton").single();
    if (error) fail("Không thể lưu cấu hình giao nhận", error);
  }

  async savePayment(settings: AdminPaymentSettings) {
    const { error } = await this.client.from("payment_settings").update({
      bank_transfer_enabled: settings.bankTransferEnabled, cash_enabled: settings.cashEnabled,
      cash_delivery_enabled: settings.cashEnabled && settings.cashDeliveryEnabled,
      cash_pickup_enabled: settings.cashEnabled && settings.cashPickupEnabled,
      bank_id: nullable(settings.bankId), bank_name: nullable(settings.bankName),
      account_number: nullable(settings.accountNumber), account_holder: nullable(settings.accountHolder),
      vietqr_template: nullable(settings.vietqrTemplate), transfer_reference_template: nullable(settings.transferReferenceTemplate),
      payment_deadline_hours: settings.paymentDeadlineHours,
      bank_instructions_vi: nullable(settings.bankInstructionsVi), bank_instructions_ko: nullable(settings.bankInstructionsKo),
      cash_instructions_vi: nullable(settings.cashInstructionsVi), cash_instructions_ko: nullable(settings.cashInstructionsKo),
    }).eq("singleton", true).select("singleton").single();
    if (error) fail("Không thể lưu cấu hình thanh toán", error);
  }

  async saveZone(zone: AdminDeliveryZone) {
    const { error } = await this.client.rpc("admin_save_delivery_zone", {
      target_zone_id: zone.id,
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
    const values = {
      stable_code: window.stableCode.trim(), label_vi: window.labelVi.trim(), label_ko: window.labelKo.trim(),
      help_vi: nullable(window.helpVi), help_ko: nullable(window.helpKo), start_time: window.startTime,
      end_time: window.endTime, active: window.active, same_day_eligible: window.sameDayEligible, sort_order: window.sortOrder,
    };
    const result = window.id
      ? await this.client.from("delivery_windows").update(values).eq("id", window.id).select("id").single()
      : await this.client.from("delivery_windows").insert(values).select("id").single();
    if (result.error) fail("Không thể lưu khung giờ", result.error);
  }
}

export function createAdminOperationsRepository() {
  return new AdminOperationsRepository();
}
