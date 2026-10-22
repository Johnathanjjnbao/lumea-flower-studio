import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, mkdir, open, readdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { artifactName, verifyArtifact, writeManifest } from "./lib/review-artifact.mjs";

const target = process.argv[2] ?? "github";
if (!["github", "cloudflare"].includes(target)) throw new Error("Unknown Review packaging target");
const cloudflare = target === "cloudflare";
const hostname = cloudflare ? process.env.VITE_REVIEW_HOSTNAME : null;
if (cloudflare && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.pages\.dev$/.test(hostname ?? "")) {
  throw new Error("Cloudflare package requires exact VITE_REVIEW_HOSTNAME under pages.dev");
}
const variant = cloudflare ? "review-cloudflare" : "review-hosted";
const root = resolve(cloudflare ? "dist-review-cloudflare" : "dist-review");
await mkdir(resolve(".cache"), { recursive: true });
const lockPath = join(resolve(".cache"), "review-package.lock");
const lock = await open(lockPath, "wx");
try {
  if (existsSync(root)) {
    if (!(await lstat(root)).isDirectory()) throw new Error("Review output is not a directory");
    const names = await readdir(root);
    if (names.length && !names.includes(artifactName)) {
      // An output without a manifest cannot be proven to belong to this packager.
      throw new Error(`Existing ${root} is unmanifested; inspect it before packaging`);
    }
    if (names.includes(artifactName)) await verifyArtifact(root, { expectedVariant: variant });
  }
  execFileSync(process.execPath, [resolve("node_modules/typescript/bin/tsc"), "-b"], { stdio: "inherit" });
  execFileSync(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "build", "--mode", variant], { stdio: "inherit" });
  await writeManifest(root, { variant, hostname });
  const files = await verifyArtifact(root, { expectedVariant: variant, expectedHostname: hostname });
  execFileSync(process.execPath, [resolve("scripts/check-secrets.mjs"), "--artifact", root], { stdio: "inherit" });
  console.log(`Review package PASS: ${files.length} manifest-verified files in ${root}`);
} finally {
  await lock.close();
  await unlink(lockPath);
}
