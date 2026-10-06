import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRODUCTION_HOSTNAME,
  PRODUCTION_ORIGIN,
  TURNSTILE_ACTION,
  MAX_REQUEST_BYTES,
  allowedOrigin,
  classifyOrderError,
  evaluateSiteverify,
  hmacIdentifier,
  parseGatewayRequest,
  readJsonBody,
  serverObservedIp,
} from "../supabase/functions/create-checkout-order/gateway.ts";
import { validateSiteProfile } from "../src/features/siteSettings/validation.ts";
import { filterCatalogProducts, readCatalogDiscoveryState } from "../src/utils/catalogDiscovery.ts";

const uuid = "11111111-1111-4111-8111-111111111111";
const validRequest = {
  request: { payload: { locale: "vi" }, idempotency_key: uuid, reviewed_subtotal: 100_000 },
  turnstile_token: "test-token",
};

assert.equal(TURNSTILE_ACTION, "checkout_submit");
assert.equal(PRODUCTION_HOSTNAME, "johnathanjjnbao.github.io");
assert(allowedOrigin(PRODUCTION_ORIGIN, false));
assert(!allowedOrigin("http://localhost:5173", false), "Production must not allow localhost CORS.");
assert(allowedOrigin("http://localhost:5173", true));
assert(!allowedOrigin("https://attacker.example", true));

assert.deepEqual(parseGatewayRequest(validRequest), validRequest);
assert.equal(parseGatewayRequest({ ...validRequest, unexpected: true }), null);
assert.equal(parseGatewayRequest({ ...validRequest, turnstile_token: "x".repeat(2049) }), null);
assert.equal(parseGatewayRequest({ ...validRequest, request: { ...validRequest.request, reviewed_subtotal: 0.5 } }), null);
assert.equal(parseGatewayRequest({ ...validRequest, request: { ...validRequest.request, idempotency_key: "not-a-uuid" } }), null);
assert.deepEqual(await readJsonBody(new Request("https://gateway.test", {
  method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(validRequest),
})), validRequest);
assert.equal(await readJsonBody(new Request("https://gateway.test", {
  method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify(validRequest),
})), null);
assert.equal(await readJsonBody(new Request("https://gateway.test", {
  method: "POST", headers: { "content-type": "application/json" }, body: `"${"x".repeat(MAX_REQUEST_BYTES)}"`,
})), null);

assert.deepEqual(evaluateSiteverify({ success: true, hostname: PRODUCTION_HOSTNAME, action: TURNSTILE_ACTION }, PRODUCTION_HOSTNAME), { ok: true });
assert.equal(evaluateSiteverify({ success: false, "error-codes": ["invalid-input-response"] }, PRODUCTION_HOSTNAME).code, "VERIFICATION_FAILED");
assert.equal(evaluateSiteverify({ success: false, "error-codes": ["timeout-or-duplicate"] }, PRODUCTION_HOSTNAME).code, "VERIFICATION_EXPIRED");
assert.equal(evaluateSiteverify({ success: true, hostname: "attacker.example", action: TURNSTILE_ACTION }, PRODUCTION_HOSTNAME).code, "VERIFICATION_FAILED");
assert.equal(evaluateSiteverify({ success: true, hostname: PRODUCTION_HOSTNAME, action: "wrong_action" }, PRODUCTION_HOSTNAME).code, "VERIFICATION_FAILED");

assert.equal(serverObservedIp(new Headers({ "x-forwarded-for": "203.0.113.10" }), false), null, "Production must ignore client-spoofable forwarding headers.");
assert.equal(serverObservedIp(new Headers({ "cf-connecting-ip": "203.0.113.20", "x-forwarded-for": "203.0.113.10" }), false), "203.0.113.20");
assert.equal(serverObservedIp(new Headers({ "cf-connecting-ip": "x".repeat(65) }), false), null);
assert.equal(serverObservedIp(new Headers({ "x-real-ip": "127.0.0.1" }), true), "127.0.0.1");

const hashOne = await hmacIdentifier("203.0.113.20", "qa-only-hmac-key-one");
const hashOneRepeat = await hmacIdentifier("203.0.113.20", "qa-only-hmac-key-one");
const hashTwo = await hmacIdentifier("203.0.113.20", "qa-only-hmac-key-two");
assert.match(hashOne, /^[0-9a-f]{64}$/);
assert.equal(hashOne, hashOneRepeat);
assert.notEqual(hashOne, hashTwo, "The identifier must be keyed, not a reversible bare IP hash.");

assert.equal(classifyOrderError("CHECKOUT_REVIEW_CHANGED"), "REVIEW_CHANGED");
assert.equal(classifyOrderError("CHECKOUT_READY_ITEM_UNAVAILABLE"), "ITEM_UNAVAILABLE");
assert.equal(classifyOrderError("CHECKOUT_PAYMENT_METHOD_UNAVAILABLE"), "FULFILLMENT_UNAVAILABLE");
assert.equal(classifyOrderError("CHECKOUT_IDEMPOTENCY_REUSED"), "IDEMPOTENCY_CONFLICT");
assert.equal(classifyOrderError("database internals"), "ORDER_UNAVAILABLE");

const validProfile = {
  businessName: "Luméa Flower Studio",
  phone: "+84 90 123 4567",
  email: "hello@lumea.example",
  instagramUrl: "https://www.instagram.com/lumea.flower/",
  instagramHandle: "@lumea.flower",
};
assert.deepEqual(validateSiteProfile(validProfile), {});
assert(validateSiteProfile({ ...validProfile, email: "not-an-email" }).email);
assert(validateSiteProfile({ ...validProfile, instagramUrl: "javascript:alert(1)" }).instagramUrl);
assert(validateSiteProfile({ ...validProfile, instagramUrl: "https://attacker.example/lumea" }).instagramUrl);
assert(validateSiteProfile({ ...validProfile, instagramHandle: "" }).instagramHandle);

const discoveryState = readCatalogDiscoveryState(
  new URLSearchParams("occasion=birthday&budget=mid&sameDay=true"),
  new Set(["birthday"]),
  new Set(["mid"]),
);
assert.equal(discoveryState.occasion, "birthday");
assert.equal(discoveryState.budget, "mid");
assert.equal(discoveryState.sameDay, true);
const discoveryProducts = [
  { name: "Birthday", stableCode: "inside", slug: "inside", shortDescription: null, description: null, composition: [], occasions: [], occasionCodes: ["birthday"], startingPriceAmount: 500_000, sameDayEligible: true, availability: "AVAILABLE" },
  { name: "Outside", stableCode: "outside", slug: "outside", shortDescription: null, description: null, composition: [], occasions: [], occasionCodes: ["birthday"], startingPriceAmount: 900_000, sameDayEligible: true, availability: "AVAILABLE" },
];
const managedBudgets = [{ id: "1", stableCode: "mid", minAmount: 400_000, maxAmount: 700_000, scaleLabel: "", label: "", description: "", sortOrder: 10 }];
assert.deepEqual(filterCatalogProducts(discoveryProducts, discoveryState, "vi", managedBudgets).map((product) => product.stableCode), ["inside"]);

const edgeSource = await readFile(new URL("../supabase/functions/create-checkout-order/index.ts", import.meta.url), "utf8");
const clientSource = await readFile(new URL("../src/features/checkout/repository.ts", import.meta.url), "utf8");
const throttleSql = await readFile(new URL("../supabase/migrations/20261005150000_checkout_anti_abuse.sql", import.meta.url), "utf8");
const operationsSql = await readFile(new URL("../supabase/migrations/20261005160000_atomic_operations_settings.sql", import.meta.url), "utf8");

assert(edgeSource.includes("SITEVERIFY_TIMEOUT_MS"));
assert(edgeSource.includes("readJsonBody"));
assert(edgeSource.includes("throttleSecret.length < 32"));
assert(edgeSource.includes("SUPABASE_SERVICE_ROLE_KEY"));
assert(!clientSource.includes('.rpc("create_checkout_order"'), "Browser code must not call the internal order RPC.");
assert(clientSource.includes('.functions.invoke("create-checkout-order"'));
for (const role of ["public", "anon", "authenticated"]) {
  assert(throttleSql.includes(`from public, anon, authenticated`), `Internal RPC revoke must include ${role}.`);
}
assert(throttleSql.includes("grant execute on function public.create_checkout_order(jsonb, uuid, bigint) to service_role"));
assert(throttleSql.includes("pg_advisory_xact_lock"));
assert(throttleSql.includes("request_count between 0 and 10"));
assert(throttleSql.indexOf("if bucket.request_count >= 10") < throttleSql.indexOf("if request_idempotency_key = any(bucket.idempotency_keys)"));
assert(operationsSql.includes("deferrable initially deferred"));
assert(operationsSql.includes("ADMIN_OPERATIONS_STALE"));
assert(operationsSql.includes("revoke insert, update, delete on table public.delivery_settings from authenticated"));
assert(operationsSql.includes("revoke insert, update, delete on table public.payment_settings from authenticated"));

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }))).flat();
}

const browserFiles = [
  ...await listFiles(fileURLToPath(new URL("../src", import.meta.url))),
  ...await listFiles(fileURLToPath(new URL("../dist", import.meta.url))).catch(() => []),
];
for (const file of browserFiles) {
  if (!/\.(?:js|ts|tsx|html|css)$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  assert(!source.includes("TURNSTILE_SECRET_KEY"), `Turnstile secret name leaked into browser artifact: ${file}`);
  assert(!source.includes("SUPABASE_SERVICE_ROLE_KEY"), `Service-role key name leaked into browser artifact: ${file}`);
}

console.log("Step 15 unit/static checks passed: Turnstile validation, production origin/IP trust, keyed identifiers, gateway-only checkout, RPC grants, bounded throttle, and atomic operation guards.");
