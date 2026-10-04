import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseClient } from "../../lib/supabase";
import type { Locale } from "../../types/content";
import type { CheckoutOptions } from "./types";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseOptions(value: unknown): CheckoutOptions {
  const source = record(value);
  const payment = record(source?.payment_methods);
  const pickupSource = record(source?.pickup);
  const zones = Array.isArray(source?.zones) ? source.zones : [];
  const windows = Array.isArray(source?.windows) ? source.windows : [];
  if (!source || !payment) throw new Error("CHECKOUT_OPTIONS_INVALID");
  return {
    deliveryEnabled: source.delivery_enabled === true,
    pickupEnabled: source.pickup_enabled === true,
    sameDayEnabled: source.same_day_enabled === true,
    sameDayCutoff: text(source.same_day_cutoff),
    deliveryHelp: text(source.delivery_help),
    pickup: pickupSource && text(pickupSource.name) && text(pickupSource.address) && text(pickupSource.hours) ? {
      name: text(pickupSource.name)!,
      address: text(pickupSource.address)!,
      hours: text(pickupSource.hours)!,
    } : null,
    zones: zones.flatMap((value) => {
      const zone = record(value);
      const feeAmount = zone?.fee_amount;
      const areas = Array.isArray(zone?.areas) ? zone.areas : [];
      if (!zone || !text(zone.id) || !text(zone.code) || !text(zone.name)
        || !Number.isSafeInteger(feeAmount) || Number(feeAmount) < 0 || Number(feeAmount) > 9_999_999_999_999) return [];
      return [{
        id: text(zone.id)!, code: text(zone.code)!, name: text(zone.name)!, help: text(zone.help),
        feeAmount: Number(feeAmount), sameDayEligible: zone.same_day_eligible === true,
        areas: areas.flatMap((areaValue) => {
          const area = record(areaValue);
          return area && text(area.id) && text(area.code) && text(area.name)
            ? [{ id: text(area.id)!, code: text(area.code)!, name: text(area.name)! }]
            : [];
        }),
      }];
    }),
    windows: windows.flatMap((value) => {
      const window = record(value);
      if (!window || !text(window.id) || !text(window.code) || !text(window.label)
        || !text(window.start_time) || !text(window.end_time)) return [];
      return [{
        id: text(window.id)!, code: text(window.code)!, label: text(window.label)!, help: text(window.help),
        startTime: text(window.start_time)!, endTime: text(window.end_time)!, sameDayEligible: window.same_day_eligible === true,
      }];
    }),
    paymentMethods: {
      bankTransfer: payment.bank_transfer === true,
      cash: payment.cash === true,
      cashDelivery: payment.cash_delivery === true,
      cashPickup: payment.cash_pickup === true,
    },
  };
}

export async function loadCheckoutOptions(locale: Locale): Promise<CheckoutOptions> {
  const client = requirePublicSupabaseClient() as SupabaseClient<any>;
  const { data, error } = await client.rpc("get_checkout_options", { requested_locale: locale });
  if (error) throw new Error(error.message);
  return parseOptions(data);
}

export function checkoutPreviewFee(options: CheckoutOptions | null, fulfillment: "DELIVERY" | "PICKUP", areaId: string) {
  if (!options) return null;
  if (fulfillment === "PICKUP") return options.pickupEnabled ? 0 : null;
  return options.zones.find((zone) => zone.areas.some((area) => area.id === areaId))?.feeAmount ?? null;
}
