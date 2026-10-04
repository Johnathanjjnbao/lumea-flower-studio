import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });

try {
  const [domain, { vi }, { ko }] = await Promise.all([
    vite.ssrLoadModule("/src/features/admin/orders/domain.ts"),
    vite.ssrLoadModule("/src/i18n/vi.ts"),
    vite.ssrLoadModule("/src/i18n/ko.ts"),
  ]);

  const expected = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PREPARING"],
    PREPARING: ["READY"],
    READY: ["FULFILLING", "COMPLETED"],
    FULFILLING: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  assert.deepEqual(domain.ORDER_TRANSITIONS, expected, "client lifecycle must match the approved V1 matrix");
  for (const [current, allowed] of Object.entries(expected)) {
    for (const next of domain.ORDER_STATUSES) {
      assert.equal(domain.isAllowedOrderTransition(current, next), allowed.includes(next), `${current} -> ${next}`);
    }
  }

  const bouquet = domain.parseCustomBouquetSnapshot({
    flowers: [{ flower_id: "11111111-1111-4111-8111-111111111111", flower_code: "garden-rose", name: "Hồng garden", quantity: 5, unit_price: 55_000, line_total: 275_000 }],
    total_stems: 5,
    wrapping: { type_id: "22222222-2222-4222-8222-222222222222", type_code: "classic-paper", type_name: "Giấy cổ điển", variant_id: "33333333-3333-4333-8333-333333333333", variant_code: "ivory", variant_name: "Ivory", swatch: "#EEE8DE", price: 0 },
  });
  assert.equal(bouquet.flowers[0].quantity, 5);
  assert.equal(bouquet.wrapping.variantCode, "ivory");
  assert.equal(domain.parseCustomBouquetSnapshot({ flowers: [], total_stems: "5", wrapping: {} }), null, "malformed historical JSON must fail safely");
  assert.equal(domain.parseCustomBouquetSnapshot(null), null);

  for (const status of domain.ORDER_STATUSES) {
    assert.ok(vi.adminOrders.statuses[status], `missing VI status ${status}`);
    assert.ok(ko.adminOrders.statuses[status], `missing KO status ${status}`);
  }
  for (const status of ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"]) {
    assert.ok(vi.adminOrders.paymentStatuses[status]);
    assert.ok(ko.adminOrders.paymentStatuses[status]);
  }

  const sql = await readFile("supabase/migrations/20261005100000_admin_orders.sql", "utf8");
  for (const functionName of ["admin_list_orders", "admin_transition_order_status"]) {
    assert.match(sql, new RegExp(`create or replace function public\\.${functionName}`));
  }
  assert.match(sql, /security definer\s+set search_path = ''/g);
  assert.match(sql, /for update;/, "transition must lock the authoritative order row");
  assert.match(sql, /current_order\.status <> expected_status/, "stale client state must be rejected");
  assert.match(sql, /ORDER_STATUS_CONFLICT/);
  assert.match(sql, /ORDER_STATUS_INVALID_TRANSITION/);
  assert.match(sql, /insert into public\.order_status_events/, "every transition must write history in the same transaction");
  assert.match(sql, /grant execute on function public\.admin_transition_order_status[\s\S]*to authenticated;/);
  assert.doesNotMatch(sql, /grant (insert|update|delete|all)[^;]*public\.orders[^;]*to authenticated/i, "authenticated clients must never receive direct order mutation grants");
  assert.doesNotMatch(sql, /grant select on table public\.orders/i, "order reads must use a column allowlist");
  assert.doesNotMatch(sql, /grant select \([\s\S]*idempotency_key_hash[\s\S]*\) on table public\.orders/i, "Admin browser must not receive checkout idempotency hashes");
  assert.doesNotMatch(sql, /grant execute[^;]*to anon/i, "Admin RPCs must not be executable by anonymous shoppers");
  assert.match(sql, /using \(public\.is_admin\(\)\)/, "PII reads must require active ADMIN membership");
  assert.match(sql, /page_size < 1 or page_size > 50/, "list pagination must be bounded server-side");

  console.log("Admin Orders lifecycle, snapshots, VI/KO, pagination, RLS, RPC, concurrency, and history contracts passed.");
} finally {
  await vite.close();
}
