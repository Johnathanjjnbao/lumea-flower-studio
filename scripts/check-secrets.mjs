import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inventory } from "./lib/review-artifact.mjs";

const allowedExamples = new Set([".env.example", "supabase/.env.example"]);
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  ["JWT-like credential", /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
];
const sensitiveAssignment = /^\s*(?:SUPABASE_SERVICE_ROLE_KEY|TURNSTILE_SECRET_KEY|CHECKOUT_THROTTLE_HMAC_KEY|DATABASE_URL)\s*[:=]\s*\S+/m;
const findings = [];
const mode = process.argv[2] ?? "--source";

function scanText(label, value, allowExample = false) {
  for (const [kind, pattern] of patterns) if (pattern.test(value)) findings.push(`${label}: ${kind}`);
  if (!allowExample && sensitiveAssignment.test(value)) findings.push(`${label}: sensitive value assignment`);
}

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 200 * 1024 * 1024, ...options });
}

try {
  if (mode === "--source") {
    const files = git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean);
    for (const file of files) {
      const path = file.replaceAll("\\", "/");
      if ((path.startsWith(".env") || path.includes("/.env")) && !allowedExamples.has(path)) findings.push(`${path}: non-example environment file`);
      const bytes = readFileSync(file);
      if (bytes.length > 2_000_000 || bytes.includes(0)) continue;
      scanText(path, bytes.toString("utf8"), allowedExamples.has(path));
    }
    console.log(`Source scan examined ${files.length} tracked/untracked non-ignored files.`);
  } else if (mode === "--history") {
    git(["fsck", "--connectivity-only", "--no-reflogs"], { stdio: ["ignore", "pipe", "pipe"] });
    const refs = git(["for-each-ref", "--format=%(refname)"]).trim();
    if (!refs) throw new Error("No local Git refs available");
    const history = git(["log", "-p", "--all", "--no-ext-diff", "--no-textconv"]);
    scanText("reachable local Git history", history);
    console.log(`History scan examined reachable commits across ${refs.split("\n").length} local refs; remote/unfetched objects are outside scope.`);
  } else if (mode === "--artifact") {
    const root = process.argv[3] ?? "dist-review";
    const files = await inventory(root);
    for (const file of files) {
      const bytes = readFileSync(join(root, file.path));
      if (bytes.includes(0)) continue;
      scanText(`Review artifact ${file.path}`, bytes.toString("utf8"));
    }
    console.log(`Artifact secret scan examined all ${files.length} packaged files.`);
  } else throw new Error(`Unknown scan mode: ${mode}`);
  if (findings.length) {
    console.error(`Secret scan FAIL (${findings.length} redacted finding(s)):\n${findings.map((finding) => `- ${finding}`).join("\n")}`);
    process.exitCode = 1;
  } else console.log("Secret scan PASS (high-confidence patterns; no credential values printed).");
} catch (error) {
  console.error(`Secret scan INCOMPLETE: ${error.message}`);
  process.exitCode = 2;
}
