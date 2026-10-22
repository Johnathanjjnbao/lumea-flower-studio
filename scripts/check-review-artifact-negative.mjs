import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { verifyArtifact, writeManifest } from "./lib/review-artifact.mjs";

const root = await mkdtemp(join(tmpdir(), "lumea-review-gate-"));
const shell = '<!doctype html><html><head><meta name="robots" content="noindex,nofollow,noarchive" /></head><body><script src="/lumea-review-preview/assets/index-test.js"></script></body></html>';
async function file(path, content) {
  const target = join(root, path);
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
  console.log("Review artifact negative tests PASS (stale Admin, env file, live endpoint/hash contamination)");
} finally {
  // This temp directory is created and owned exclusively by this test.
  await rm(root, { recursive: true, force: true });
}
