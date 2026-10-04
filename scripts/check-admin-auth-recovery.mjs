import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });

try {
  const recovery = await vite.ssrLoadModule("/src/features/admin/auth/adminRecovery.ts");
  const productionOrigin = "https://johnathanjjnbao.github.io";
  assert.equal(
    recovery.buildAdminRecoveryRedirectUrl(productionOrigin, "/lumea-flower-studio/", "vi"),
    `${productionOrigin}/lumea-flower-studio/admin/reset-password`,
  );
  assert.equal(
    recovery.buildAdminRecoveryRedirectUrl(productionOrigin, "/lumea-flower-studio/", "ko"),
    `${productionOrigin}/lumea-flower-studio/ko/admin/reset-password`,
  );
  assert.equal(
    recovery.buildAdminRecoveryRedirectUrl("http://127.0.0.1:4173", "/lumea-flower-studio/", "vi"),
    "http://127.0.0.1:4173/lumea-flower-studio/admin/reset-password",
  );
  assert.throws(
    () => recovery.buildAdminRecoveryRedirectUrl("http://example.com", "/lumea-flower-studio/", "vi"),
    /Unsupported recovery origin/,
    "plain HTTP recovery must remain local-only",
  );
  assert.throws(
    () => recovery.buildAdminRecoveryRedirectUrl(productionOrigin, "https://evil.example/", "vi"),
    /current origin/,
    "a build-time base must not turn into an external recovery redirect",
  );

  assert.equal(recovery.isValidAdminEmail(" owner@example.com "), true);
  assert.equal(recovery.isValidAdminEmail("not-an-email"), false);
  assert.equal(recovery.isValidAdminEmail(`${"a".repeat(245)}@example.com`), false);
  assert.equal(recovery.validateAdminPassword("", ""), "password-required");
  assert.equal(recovery.validateAdminPassword("12345678901234", "12345678901234"), "password-too-short");
  assert.equal(recovery.validateAdminPassword("123456789012345", ""), "confirmation-required");
  assert.equal(recovery.validateAdminPassword("123456789012345", "543210987654321"), "mismatch");
  assert.equal(recovery.validateAdminPassword("123456789012345", "123456789012345"), null);

  assert.equal(recovery.getAdminRecoveryUrlState("https://example.test/admin/reset-password"), "none");
  assert.equal(recovery.getAdminRecoveryUrlState("https://example.test/admin/reset-password?code=one-time"), "recovery");
  assert.equal(recovery.getAdminRecoveryUrlState("https://example.test/admin/reset-password#type=recovery"), "none");
  assert.equal(recovery.getAdminRecoveryUrlState("https://example.test/admin/reset-password#access_token=token&type=recovery"), "recovery");
  assert.equal(recovery.getAdminRecoveryUrlState("https://example.test/admin/reset-password#error=access_denied&error_code=otp_expired"), "error");
  assert.equal(recovery.getAdminRecoveryUrlState("not a url"), "none");

  const entries = new Map();
  const storage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  };
  recovery.writeAdminRecoveryMarker(storage, 1_000);
  assert.equal(recovery.hasValidAdminRecoveryMarker(storage, 1_001), true);
  assert.equal(recovery.hasValidAdminRecoveryMarker(storage, 1_000 + recovery.ADMIN_RECOVERY_MARKER_TTL_MS), false);
  entries.set(recovery.ADMIN_RECOVERY_MARKER_KEY, "malformed");
  assert.equal(recovery.hasValidAdminRecoveryMarker(storage, 1_001), false);
  recovery.writeAdminRecoveryMarker(storage, 1_000);
  recovery.clearAdminRecoveryMarker(storage);
  assert.equal(entries.has(recovery.ADMIN_RECOVERY_MARKER_KEY), false);

  console.log("Admin password recovery domain: PASS");
  console.log("Redirect allowlist construction, validation, callback states, and parse-safe session marker verified");
} finally {
  await vite.close();
}
