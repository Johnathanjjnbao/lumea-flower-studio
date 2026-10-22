import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, mkdir, open, readdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { artifactName, verifyArtifact, writeManifest } from "./lib/review-artifact.mjs";

const root = resolve("dist-review");
await mkdir(resolve(".cache"), { recursive: true });
const lockPath = join(resolve(".cache"), "review-package.lock");
const lock = await open(lockPath, "wx");
try {
  if (existsSync(root)) {
    if (!(await lstat(root)).isDirectory()) throw new Error("Review output is not a directory");
    const names = await readdir(root);
    if (names.length && !names.includes(artifactName)) {
      // An output without a manifest cannot be proven to belong to this packager.
      throw new Error("Existing dist-review is unmanifested; inspect it before packaging");
    }
    if (names.includes(artifactName)) await verifyArtifact(root);
  }
  execFileSync(process.execPath, [resolve("node_modules/typescript/bin/tsc"), "-b"], { stdio: "inherit" });
  execFileSync(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "build", "--mode", "review-hosted"], { stdio: "inherit" });
  await writeManifest(root);
  const files = await verifyArtifact(root);
  execFileSync(process.execPath, [resolve("scripts/check-secrets.mjs"), "--artifact", root], { stdio: "inherit" });
  console.log(`Review package PASS: ${files.length} manifest-verified files in dist-review`);
} finally {
  await lock.close();
  await unlink(lockPath);
}
