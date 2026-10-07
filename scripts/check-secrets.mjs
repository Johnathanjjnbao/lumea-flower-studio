import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const allowedEnvironmentFiles = new Set([".env.example", "supabase/.env.example"]);
const trackedFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
  .toString("utf8").split("\0").filter(Boolean);
const findings = [];
const credentialPatterns = [
  ["private key", new RegExp("-----BEGIN (?:RSA |EC |OPENSSH |DSA )?" + "PRIVATE KEY-----")],
  ["GitHub token", new RegExp("\\bgh" + "[pousr]_[A-Za-z0-9_]{30,}\\b")],
  ["Supabase secret key", new RegExp("\\bsb_" + "secret_[A-Za-z0-9_-]{20,}\\b")],
  ["JWT-like credential", /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
];

for (const file of trackedFiles) {
  const normalized = file.replaceAll("\\", "/");
  if ((normalized.startsWith(".env") || normalized.includes("/.env")) && !allowedEnvironmentFiles.has(normalized)) {
    findings.push(`${normalized}: tracked environment file is not allowlisted`);
  }

  const buffer = readFileSync(file);
  if (buffer.length > 2_000_000 || buffer.includes(0)) continue;
  const text = buffer.toString("utf8");
  for (const [label, pattern] of credentialPatterns) {
    if (pattern.test(text)) findings.push(`${normalized}: ${label}`);
  }

  if (!allowedEnvironmentFiles.has(normalized)) {
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      if (/^\s*(?:SUPABASE_SERVICE_ROLE_KEY|TURNSTILE_SECRET_KEY|CHECKOUT_THROTTLE_HMAC_KEY|DATABASE_URL)\s*[:=]\s*\S+/.test(line)) {
        findings.push(`${normalized}:${index + 1}: sensitive value assignment`);
      }
    }
  }
}

if (process.argv.includes("--history")) {
  const history = execFileSync(
    "git",
    ["log", "-p", "--all", "--no-ext-diff", "--no-textconv"],
    { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 },
  );
  for (const [label, pattern] of credentialPatterns) {
    if (pattern.test(history)) findings.push(`Git history: ${label}`);
  }
}

if (findings.length) {
  console.error(`Secret scan failed:\n${findings.map((finding) => `- ${finding}`).join("\n")}`);
  process.exit(1);
}

console.log(`Secret scan passed (${trackedFiles.length} repository files${process.argv.includes("--history") ? " plus Git history" : ""}; approved examples only).`);
