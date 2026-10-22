import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const temp = await mkdtemp(join(tmpdir(), "lumea-secret-scan-"));
const artifact = join(temp, "artifact");
const repository = join(temp, "history");
const fake = "sb_" + "secret_" + "A".repeat(25);
const scanner = resolve("scripts/check-secrets.mjs");
const run = (args, cwd = process.cwd()) => spawnSync(process.execPath, [scanner, ...args], { cwd, encoding: "utf8" });
try {
  await mkdir(artifact);
  await writeFile(join(artifact, "index.html"), "sb_publishable_example_only");
  assert.equal(run(["--artifact", artifact]).status, 0, "Public client config must remain allowed");
  await writeFile(join(artifact, "index.html"), fake);
  const secretResult = run(["--artifact", artifact]);
  assert.equal(secretResult.status, 1, "Synthetic secret must fail");
  assert.ok(secretResult.stderr.includes("Supabase secret key"));
  assert.ok(!`${secretResult.stdout}${secretResult.stderr}`.includes(fake), "Secret must be redacted");

  await mkdir(repository);
  execFileSync("git", ["init", "-q", repository]);
  await mkdir(join(repository, ".git", "refs", "heads"), { recursive: true });
  await writeFile(join(repository, ".git", "refs", "heads", "broken"), "f".repeat(40) + "\n");
  const incomplete = run(["--history"], repository);
  assert.equal(incomplete.status, 2, "Missing reachable Git object must mark history incomplete");
  assert.ok(incomplete.stderr.includes("INCOMPLETE"));
  console.log("Secret scan tests PASS (synthetic secret detection/redaction, public key, incomplete history)");
} finally {
  await rm(temp, { recursive: true, force: true });
}
