import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const expected = process.argv[2];
assert.ok(["normal", "review", "hosted"].includes(expected), "Pass normal, review, or hosted after the matching build.");
const dir = fileURLToPath(new URL("../dist/assets/", import.meta.url));
const files = (await readdir(dir)).filter((name) => name.endsWith(".js"));
const source = (await Promise.all(files.map((name) => readFile(join(dir, name), "utf8")))).join("\n");
const markers = ["lumea.review.cart.v1", "REVIEW_MODE_ORDER_DISABLED", "review-occasion-"];
for (const marker of markers) {
  assert.equal(source.includes(marker), expected !== "normal", `${marker} should ${expected === "normal" ? "not " : ""}be bundled`);
}
if (expected === "hosted") {
  const html = await readFile(fileURLToPath(new URL("../dist/index.html", import.meta.url)), "utf8");
  assert.ok(html.includes('name="robots" content="noindex,nofollow,noarchive"'), "Hosted review must request no indexing");
  assert.ok(html.includes('/lumea-review-preview/assets/'), "Hosted review must use the independent Pages base");
  assert.ok(!files.some((name) => name.startsWith("AdminRoutes-")), "Hosted review must not ship the Admin route chunk");
  for (const forbidden of ["nihhynwvltttadlfatdm", "puzuubnxarmviwgpjclj", "service_role", "create-checkout-order"]) {
    assert.ok(!source.includes(forbidden), `Hosted review artifact contains forbidden marker: ${forbidden}`);
  }
  for (const route of ["flowers/pink-garden", "ko/flowers/pink-garden", "about", "ko/about", "contact", "ko/contact", "same-day", "ko/same-day"]) {
    const routeHtml = await readFile(fileURLToPath(new URL(`../dist/${route}/index.html`, import.meta.url)), "utf8");
    assert.equal(routeHtml, html, `${route} must have a direct-link entry`);
  }
}
console.log(`${expected} bundle review isolation PASS (${files.length} JS assets)`);
