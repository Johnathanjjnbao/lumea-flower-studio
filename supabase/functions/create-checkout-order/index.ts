import { createClient } from "npm:@supabase/supabase-js@2";
import {
  PRODUCTION_HOSTNAME,
  TURNSTILE_ACTION,
  TURNSTILE_TEST_ACTION,
  allowedOrigin,
  classifyOrderError,
  evaluateSiteverify,
  hmacIdentifier,
  parseGatewayRequest,
  readJsonBody,
  serverObservedIp,
  type CheckoutGatewayRequest,
  type SiteverifyResponse,
} from "./gateway.ts";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 8_000;

function isTestMode() {
  return Deno.env.get("TURNSTILE_TEST_MODE") === "true";
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(origin: string, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function verifyTurnstile(
  token: string,
  remoteIp: string,
  secret: string,
  expectedHostname: string,
  expectedAction: string,
  allowOfficialTestingKey: boolean,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SITEVERIFY_TIMEOUT_MS);
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false as const, code: "VERIFICATION_UNAVAILABLE" as const };
    const result = await response.json() as SiteverifyResponse;
    return evaluateSiteverify(result, expectedHostname, expectedAction, allowOfficialTestingKey);
  } catch {
    return { ok: false as const, code: "VERIFICATION_UNAVAILABLE" as const };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigin(origin, isTestMode())) return new Response(null, { status: 403 });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return jsonResponse(origin, 405, { code: "INVALID_REQUEST" });

  const ip = serverObservedIp(request.headers, isTestMode());
  if (!ip) return jsonResponse(origin, 503, { code: "VERIFICATION_UNAVAILABLE" });

  let body: CheckoutGatewayRequest | null = null;
  try {
    body = parseGatewayRequest(await readJsonBody(request));
  } catch {
    // Invalid JSON is deliberately indistinguishable from another malformed request.
  }
  if (!body) return jsonResponse(origin, 400, { code: "INVALID_REQUEST" });
  if (!body.turnstile_token.trim()) return jsonResponse(origin, 400, { code: "VERIFICATION_REQUIRED" });

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const throttleSecret = Deno.env.get("CHECKOUT_THROTTLE_HMAC_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!turnstileSecret || !throttleSecret || throttleSecret.length < 32 || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(origin, 503, { code: "VERIFICATION_UNAVAILABLE" });
  }

  const verification = await verifyTurnstile(
    body.turnstile_token,
    ip,
    turnstileSecret,
    isTestMode() ? new URL(origin).hostname : PRODUCTION_HOSTNAME,
    isTestMode() ? TURNSTILE_TEST_ACTION : TURNSTILE_ACTION,
    isTestMode(),
  );
  if (!verification.ok) return jsonResponse(origin, 403, { code: verification.code });

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const identifierHash = await hmacIdentifier(ip, throttleSecret);
  const throttleResult = await client.rpc("consume_checkout_throttle", {
    request_identifier_hash: identifierHash,
    request_idempotency_key: body.request.idempotency_key,
  });
  if (throttleResult.error) return jsonResponse(origin, 503, { code: "ORDER_UNAVAILABLE" });
  const throttle = Array.isArray(throttleResult.data) ? throttleResult.data[0] : null;
  if (!throttle?.allowed) return jsonResponse(origin, 429, { code: "RATE_LIMITED" });

  const orderResult = await client.rpc("create_checkout_order", {
    checkout_payload: body.request.payload,
    checkout_idempotency_key: body.request.idempotency_key,
    reviewed_subtotal: body.request.reviewed_subtotal,
  });
  if (orderResult.error) {
    return jsonResponse(origin, 409, { code: classifyOrderError(orderResult.error.message) });
  }
  return jsonResponse(origin, 200, { data: orderResult.data });
});
