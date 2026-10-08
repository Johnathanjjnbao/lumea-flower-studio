import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";

const checks = [
  "check:builder-persistence",
  "check:builder-pricing",
  "check:cart",
  "check:checkout",
  "check:admin-auth-recovery",
  "check:admin-orders",
  "check:homepage-visit",
  "check:step15",
  "check:v2-commerce",
  "typecheck",
];

const npmCli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
for (const check of checks) {
  const command = process.platform === "win32" ? process.execPath : "npm";
  const args = process.platform === "win32" ? [npmCli, "run", check] : ["run", check];
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`CI contract suite passed (${checks.length} checks).`);
