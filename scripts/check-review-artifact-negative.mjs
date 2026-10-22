import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { verifyArtifact, writeManifest } from "./lib/review-artifact.mjs";

const root = await mkdtemp(join(tmpdir(), "lumea-review-gate-"));
const cloudflareRoot = await mkdtemp(join(tmpdir(), "lumea-review-cloudflare-gate-"));
const shell = '<!doctype html><html><head><meta name="robots" content="noindex,nofollow,noarchive" /></head><body><script src="/lumea-review-preview/assets/index-test.js"></script></body></html>';
async function file(path, content, base = root) {
  const target = join(base, path);
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, content);
}
async function reject(label) {
  await assert.rejects(() => verifyArtifact(root), undefined, label);
}
try {
  for (const path of ["index.html", "404.html", "checkout/index.html", "ko/checkout/index.html"]) await file(path, shell);
  await file(".nojekyll", "");
  await file("assets/index-test.js", "console.log('review-only')");
  await writeManifest(root);
  await verifyArtifact(root);

  await file("assets/AdminRoutes-stale.js", "console.log('admin')");
  await reject("unlisted stale Admin chunk");
  await rm(join(root, "assets", "AdminRoutes-stale.js"));
  await file(".env.production", "VITE_SECRET=fixture");
  await reject("unlisted environment file");
  await rm(join(root, ".env.production"));
  await rm(join(root, "assets", "index-test.js"));
  await reject("missing referenced asset");
  await file("assets/index-test.js", "fetch('/functions/v1/create-checkout-order')");
  await reject("modified live checkout endpoint");
  await file("assets/index-test.js", "console.log('review-only')");
  await verifyArtifact(root);

  const hostname = "lumea-review-test.pages.dev";
  const cloudflareShell = shell.replace("/lumea-review-preview/assets/", "/assets/");
  for (const path of ["index.html", "404.html", "checkout/index.html", "ko/checkout/index.html"]) {
    await file(path, cloudflareShell, cloudflareRoot);
  }
  await file("assets/index-test.js", `console.log('${hostname}')`, cloudflareRoot);
  await writeManifest(cloudflareRoot, { variant: "review-cloudflare", hostname });
  await verifyArtifact(cloudflareRoot, { expectedVariant: "review-cloudflare", expectedHostname: hostname });
  await assert.rejects(
    () => verifyArtifact(cloudflareRoot, { expectedVariant: "review-cloudflare", expectedHostname: "wrong.pages.dev" }),
    undefined,
    "Cloudflare artifact must match the selected hostname",
  );
  await assert.rejects(
    () => verifyArtifact(cloudflareRoot, { expectedVariant: "review-hosted" }),
    undefined,
    "Cloudflare artifact cannot be mistaken for a GitHub Pages package",
  );
  console.log("Review artifact negative tests PASS (stale files, hash contamination, Cloudflare host/variant mismatch)");
} finally {
  // This temp directory is created and owned exclusively by this test.
  await rm(root, { recursive: true, force: true });
  await rm(cloudflareRoot, { recursive: true, force: true });
}
