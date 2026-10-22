import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

export const artifactName = "review-artifact-manifest.json";
const forbiddenContent = ["create-checkout-order", "nihhynwvltttadlfatdm", "puzuubnxarmviwgpjclj"];
const allowedFile = (path) => path === ".nojekyll" || path.endsWith(".html") || /^assets\/[A-Za-z0-9_-]+\.(?:js|css)$/.test(path);

export async function inventory(root) {
  const base = resolve(root);
  const entries = [];
  async function walk(directory) {
    for (const name of await readdir(directory)) {
      const absolute = join(directory, name);
      const stat = await lstat(absolute);
      assert.ok(!stat.isSymbolicLink(), `Symlink forbidden: ${relative(base, absolute)}`);
      if (stat.isDirectory()) await walk(absolute);
      else {
        assert.ok(stat.isFile(), `Non-file forbidden: ${relative(base, absolute)}`);
        const path = relative(base, absolute).split(sep).join("/");
        if (path === artifactName) continue;
        assert.ok(allowedFile(path), `Unexpected artifact file: ${path}`);
        const bytes = await readFile(absolute);
        entries.push({ path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
      }
    }
  }
  await walk(base);
  return entries.sort((a, b) => a.path.localeCompare(b.path, "en"));
}

export async function writeManifest(root, { variant = "review-hosted", hostname = null } = {}) {
  const files = await inventory(root);
  const manifest = { format: 1, variant, hostname, files };
  await writeFile(join(root, artifactName), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  return manifest;
}

export async function verifyArtifact(root, { expectedVariant, expectedHostname } = {}) {
  const base = resolve(root);
  const manifest = JSON.parse(await readFile(join(base, artifactName), "utf8"));
  const manifestHostname = manifest.hostname ?? null;
  assert.equal(manifest.format, 1);
  assert.ok(["review-hosted", "review-cloudflare"].includes(manifest.variant), "Unknown Review variant");
  if (expectedVariant) assert.equal(manifest.variant, expectedVariant);
  if (expectedHostname !== undefined) assert.equal(manifestHostname, expectedHostname);
  if (manifest.variant === "review-cloudflare") {
    assert.match(manifestHostname, /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.pages\.dev$/);
  } else assert.equal(manifestHostname, null);
  const actual = await inventory(base);
  assert.deepEqual(actual, manifest.files, "Artifact file set/hash differs from manifest");
  const html = await readFile(join(base, "index.html"), "utf8");
  assert.ok(html.includes('name="robots" content="noindex,nofollow,noarchive"'));
  const assetPrefix = manifest.variant === "review-cloudflare" ? "/assets/" : "/lumea-review-preview/assets/";
  assert.ok(html.includes(assetPrefix), "Wrong Review asset base");
  const assetNames = new Set(actual.filter((file) => file.path.startsWith("assets/")).map((file) => file.path));
  for (const reference of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (!reference[1].startsWith(assetPrefix)) continue;
    const path = reference[1].slice(assetPrefix.length);
    assert.ok(assetNames.has(`assets/${path}`), `Missing referenced asset: assets/${path}`);
  }
  assert.ok(actual.some((file) => file.path === "404.html"));
  assert.equal(actual.some((file) => file.path === ".nojekyll"), manifest.variant === "review-hosted");
  assert.ok(actual.some((file) => file.path === "checkout/index.html"));
  assert.ok(actual.some((file) => file.path === "ko/checkout/index.html"));
  for (const file of actual) {
    if (file.path.endsWith(".html")) assert.equal(await readFile(join(base, file.path), "utf8"), html, `Stale HTML shell: ${file.path}`);
    if (!file.path.endsWith(".js")) continue;
    assert.ok(!/assets\/AdminRoutes-[^/]+\.js$/.test(file.path), "Admin route chunk forbidden");
    const source = await readFile(join(base, file.path), "utf8");
    for (const marker of forbiddenContent) assert.ok(!source.includes(marker), `Forbidden Review JS marker in ${file.path}: ${marker}`);
  }
  if (manifest.variant === "review-cloudflare") {
    const scripts = await Promise.all(actual.filter((file) => file.path.endsWith(".js")).map((file) => readFile(join(base, file.path), "utf8")));
    assert.ok(scripts.some((script) => script.includes(manifestHostname)), "Cloudflare host guard missing from JS");
  }
  return actual;
}
