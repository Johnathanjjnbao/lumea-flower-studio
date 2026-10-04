import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envText = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1)];
}));
assert.ok(env.VITE_SUPABASE_URL);
assert.ok(env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_"));

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tableRead = await client.from("orders").select("order_number").limit(1);
assert.ok(tableRead.error, "anonymous order SELECT must be denied");
assert.equal(tableRead.data, null);

const listCall = await client.rpc("admin_list_orders", { page_size: 1, page_offset: 0 });
assert.ok(listCall.error, "anonymous Admin list RPC must be denied");
assert.equal(listCall.data, null);

const transitionCall = await client.rpc("admin_transition_order_status", {
  target_order_id: "24a77a42-8599-498d-a876-05c9264c92af",
  expected_status: "PENDING",
  next_status: "CONFIRMED",
});
assert.ok(transitionCall.error, "anonymous status transition must be denied");
assert.equal(transitionCall.data, null);

const directUpdate = await client.from("orders").update({ status: "COMPLETED" }).eq("id", "24a77a42-8599-498d-a876-05c9264c92af");
assert.ok(directUpdate.error, "anonymous direct UPDATE must be denied");

console.log("Admin Orders anonymous SELECT/RPC/UPDATE boundaries passed.");
