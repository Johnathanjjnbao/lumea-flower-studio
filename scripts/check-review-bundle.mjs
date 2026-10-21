import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const expected = process.argv[2];
assert.ok(expected === "normal" || expected === "review", "Pass normal or review after the matching build.");
const dir = fileURLToPath(new URL("../dist/assets/", import.meta.url));
const files = (await readdir(dir)).filter((name) => name.endsWith(".js"));
const source = (await Promise.all(files.map((name) => readFile(join(dir, name), "utf8")))).join("\n");
const markers = ["lumea.review.cart.v1", "REVIEW_MODE_ORDER_DISABLED", "review-occasion-"];
for (const marker of markers) {
  assert.equal(source.includes(marker), expected === "review", `${marker} should ${expected === "normal" ? "not " : ""}be bundled`);
}
console.log(`${expected} bundle review isolation PASS (${files.length} JS assets)`);
