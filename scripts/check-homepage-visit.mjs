import assert from "node:assert/strict";
import { buildGoogleMapsEmbedUrl, isSafeGoogleMapsUrl, normalizePhoneHref, validateVisitSettings } from "../src/features/homepage/visitLocation.ts";
import { emptyHomepageCopy, emptyHomepageVisitSettings } from "../src/features/homepage/types.ts";

for (const url of [
  "https://www.google.com/maps/place/Lumea",
  "https://google.com/maps/dir/?api=1&destination=Lumea",
  "https://maps.google.com/maps?q=Lumea",
  "https://maps.app.goo.gl/AbCdEf",
  "https://goo.gl/maps/AbCdEf",
]) assert.equal(isSafeGoogleMapsUrl(url), true, `Expected safe Google Maps URL: ${url}`);

for (const url of [
  "javascript:alert(1)",
  "data:text/html,test",
  "http://www.google.com/maps/place/Lumea",
  "https://google.example/maps/place/Lumea",
  "https://evil.example/?next=https://www.google.com/maps",
  "https://user:password@www.google.com/maps/place/Lumea",
  "https://www.google.com/search?q=Lumea",
  "https://goo.gl/not-maps",
]) assert.equal(isSafeGoogleMapsUrl(url), false, `Expected rejected URL: ${url}`);

assert.equal(
  buildGoogleMapsEmbedUrl("Luméa Flower Studio, Quận 1"),
  "https://www.google.com/maps?q=Lum%C3%A9a%20Flower%20Studio%2C%20Qu%E1%BA%ADn%201&output=embed",
);
assert.equal(buildGoogleMapsEmbedUrl("  "), null);
assert.equal(normalizePhoneHref("+84 965 187 132"), "tel:+84965187132");
assert.equal(normalizePhoneHref("javascript:alert(1)"), null);

const vi = { ...emptyHomepageCopy(), primaryCtaLabel: "Chỉ đường" };
const ko = { ...emptyHomepageCopy(), primaryCtaLabel: "길찾기" };
const disabled = emptyHomepageVisitSettings();
assert.deepEqual(validateVisitSettings(disabled, vi, ko), {});
assert.ok(validateVisitSettings({ ...disabled, mapEnabled: true }, vi, ko).mapQuery);
assert.ok(validateVisitSettings({ ...disabled, googleMapsUrl: "https://evil.example/maps" }, vi, ko).googleMapsUrl);
assert.deepEqual(validateVisitSettings({
  phone: "+84 965 187 132",
  mapEnabled: true,
  mapQuery: "Luméa Flower Studio, Quận 1",
  googleMapsUrl: "https://www.google.com/maps/place/Lumea",
}, vi, ko), {});
assert.ok(validateVisitSettings({
  phone: "0900000000",
  mapEnabled: true,
  mapQuery: "Luméa Flower Studio",
  googleMapsUrl: "https://maps.app.goo.gl/AbCdEf",
}, { ...vi, primaryCtaLabel: "" }, ko).localizedCopy);

console.log("Homepage Visit location validation passed: fixed-origin embed, Google Maps allowlist, phone normalization, disabled fallback, and VI/KO CTA rules.");
