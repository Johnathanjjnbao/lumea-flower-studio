import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { createServer } from "vite";

const EXPECTED_PROJECT_REF = "nihhynwvltttadlfatdm";
const SEED_NAMESPACE = "lumea-live-builder-v1";
const REPOSITORY_ROOT = process.cwd();
const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

function run(command, args, cwd = REPOSITORY_ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} exited with ${code}: ${[stderr.trim(), stdout.trim()].filter(Boolean).join("\n")}`));
    });
  });
}

const npx = (...args) => process.platform === "win32"
  ? run(process.execPath, [join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"), ...args])
  : run("npx", args);

const npxFrom = (cwd, ...args) => process.platform === "win32"
  ? run(process.execPath, [join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"), ...args], cwd)
  : run("npx", args, cwd);

function deterministicUuid(key) {
  const bytes = createHash("sha256").update(`${SEED_NAMESPACE}:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sql(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function verifyLinkedProject() {
  const output = await npx("supabase", "projects", "list", "--output", "json");
  const linked = JSON.parse(output).find((project) => project.linked);
  if (!linked || linked.ref !== EXPECTED_PROJECT_REF || linked.name !== "lumea-flower-studio") {
    throw new Error(`Refusing to seed unexpected linked project: ${linked?.ref ?? "none"}.`);
  }
}

async function loadFixture() {
  const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  try {
    const [{ flowerStems, wrappingTypes, wrappingVariants }, { assets }, { vi }, { ko }] = await Promise.all([
      vite.ssrLoadModule("/src/features/bouquetBuilder/data.ts"),
      vite.ssrLoadModule("/src/data/assets.ts"),
      vite.ssrLoadModule("/src/i18n/vi.ts"),
      vite.ssrLoadModule("/src/i18n/ko.ts"),
    ]);
    return { assets, flowerStems, wrappingTypes, wrappingVariants, dictionaries: { vi, ko } };
  } finally {
    await vite.close();
  }
}

async function listUploadedObjects() {
  const output = await npx("supabase", "--experimental", "storage", "ls", "-r", "ss:///public-media/builder/flowers", "--linked", "--output-format", "json");
  return new Set((JSON.parse(output).paths ?? []).map((path) => path.replace(/^\/public-media\//, "")));
}

async function downloadImage(sourceUrl, destinationBase) {
  const response = await fetch(sourceUrl, { headers: { "user-agent": "LumeaBuilderMigration/1.0" }, redirect: "follow" });
  if (!response.ok) throw new Error(`Unable to download Builder image (${response.status}) from ${new URL(sourceUrl).hostname}.`);
  const mimeType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  const extension = mimeType ? ALLOWED_MIME_TYPES.get(mimeType) : undefined;
  if (!mimeType || !extension) throw new Error(`Unsupported Builder image type: ${mimeType ?? "unknown"}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("Downloaded Builder image is empty.");
  const filePath = `${destinationBase}.${extension}`;
  await writeFile(filePath, bytes);
  return { byteSize: bytes.length, checksum: createHash("sha256").update(bytes).digest("hex"), extension, filePath, mimeType };
}

function buildSeedSql({ flowerRecords, wrappingTypes, wrappingVariants, dictionaries }) {
  const flowerValues = flowerRecords.map(({ flower, flowerId }, index) => `(
    ${sql(flowerId)}, ${sql(flower.id)}, 'DRAFT', ${sql(flower.availability)}, ${flower.pricePerStem},
    ${flower.availability === "SEASONAL"}, ${index * 10}, ${sql(deterministicUuid(`media:${flower.id}`))}
  )`).join(",\n");
  const flowerTranslations = flowerRecords.flatMap(({ flower, flowerId }) => ["vi", "ko"].map((locale) => {
    const copy = dictionaries[locale].builder.flowers[flower.id];
    return `(${sql(flowerId)}, ${sql(locale)}, ${sql(copy.name)}, ${sql(copy.description)}, ${sql(copy.alt)})`;
  })).join(",\n");
  const mediaValues = flowerRecords.map(({ flower, image, storagePath }) => `(
    ${sql(deterministicUuid(`media:${flower.id}`))}, 'public-media', ${sql(storagePath)}, 'PUBLIC',
    ${sql(image.mimeType)}, ${image.byteSize}, ${sql(image.checksum)}, 'ACTIVE'
  )`).join(",\n");
  const mediaTranslations = flowerRecords.flatMap(({ flower }) => ["vi", "ko"].map((locale) => {
    const copy = dictionaries[locale].builder.flowers[flower.id];
    return `(${sql(deterministicUuid(`media:${flower.id}`))}, ${sql(locale)}, ${sql(copy.alt)})`;
  })).join(",\n");

  const optionValues = wrappingTypes.map((option, index) => `(
    ${sql(deterministicUuid(`wrapping-option:${option.id}`))}, ${sql(option.id)}, 'DRAFT', ${option.priceModifier}, ${index * 10}
  )`).join(",\n");
  const optionTranslations = wrappingTypes.flatMap((option) => ["vi", "ko"].map((locale) => {
    const copy = dictionaries[locale].builder.wrapTypes[option.id];
    return `(${sql(deterministicUuid(`wrapping-option:${option.id}`))}, ${sql(locale)}, ${sql(copy.name)}, ${sql(copy.description)})`;
  })).join(",\n");
  const variantValues = wrappingVariants.map((variant, index) => `(
    ${sql(deterministicUuid(`wrapping-variant:${variant.id}`))}, ${sql(variant.id)}, 'DRAFT',
    ${variant.priceModifier}, ${sql(variant.swatch)}, ${index * 10}
  )`).join(",\n");
  const variantTranslations = wrappingVariants.flatMap((variant) => ["vi", "ko"].map((locale) => (
    `(${sql(deterministicUuid(`wrapping-variant:${variant.id}`))}, ${sql(locale)}, ${sql(dictionaries[locale].builder.wrapVariants[variant.id])})`
  ))).join(",\n");
  const compatibilityValues = wrappingTypes.flatMap((option) => option.compatibleVariantIds.map((variantId, index) => `(
    ${sql(deterministicUuid(`wrapping-option:${option.id}`))},
    ${sql(deterministicUuid(`wrapping-variant:${variantId}`))}, true, ${index * 10}
  )`)).join(",\n");

  return `begin;

insert into public.media_assets (id, storage_bucket, storage_path, access, mime_type, byte_size, checksum, status)
values
${mediaValues}
on conflict (storage_bucket, storage_path) do nothing;

insert into public.media_asset_translations (media_asset_id, locale, alt_text)
values
${mediaTranslations}
on conflict (media_asset_id, locale) do nothing;

insert into public.flower_stems (
  id, stable_code, visibility, availability, price_per_stem_amount,
  seasonal_note_required, sort_order, media_asset_id
)
values
${flowerValues}
on conflict (stable_code) do nothing;

insert into public.flower_stem_translations (flower_stem_id, locale, name, description, image_alt)
values
${flowerTranslations}
on conflict (flower_stem_id, locale) do nothing;

insert into public.wrapping_variants (id, stable_code, visibility, price_modifier_amount, swatch_value, sort_order)
values
${variantValues}
on conflict (stable_code) do nothing;

insert into public.wrapping_variant_translations (wrapping_variant_id, locale, name)
values
${variantTranslations}
on conflict (wrapping_variant_id, locale) do nothing;

update public.wrapping_variants set visibility = 'PUBLISHED'
where stable_code in (${wrappingVariants.map((variant) => sql(variant.id)).join(", ")}) and visibility = 'DRAFT';

insert into public.wrapping_options (id, stable_code, visibility, price_modifier_amount, sort_order)
values
${optionValues}
on conflict (stable_code) do nothing;

insert into public.wrapping_option_translations (wrapping_option_id, locale, name, description)
values
${optionTranslations}
on conflict (wrapping_option_id, locale) do nothing;

insert into public.wrapping_option_variants (wrapping_option_id, wrapping_variant_id, active, sort_order)
values
${compatibilityValues}
on conflict (wrapping_option_id, wrapping_variant_id) do nothing;

update public.wrapping_options set visibility = 'PUBLISHED'
where stable_code in (${wrappingTypes.map((option) => sql(option.id)).join(", ")}) and visibility = 'DRAFT';

update public.flower_stems set visibility = 'PUBLISHED'
where stable_code in (${flowerRecords.map(({ flower }) => sql(flower.id)).join(", ")}) and visibility = 'DRAFT';

commit;

select
  (select count(*) from public.flower_stems where visibility = 'PUBLISHED')::int as published_flowers,
  (select count(*) from public.wrapping_options where visibility = 'PUBLISHED')::int as published_wrapping_options,
  (select count(*) from public.wrapping_variants where visibility = 'PUBLISHED')::int as published_wrapping_variants;
`;
}

async function main() {
  await verifyLinkedProject();
  const fixture = await loadFixture();
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "lumea-builder-seed-"));
  try {
    const uploadedObjects = await listUploadedObjects();
    const flowerRecords = [];
    for (const flower of fixture.flowerStems) {
      const flowerId = deterministicUuid(`flower:${flower.id}`);
      const mediaId = deterministicUuid(`media:${flower.id}`);
      const image = await downloadImage(fixture.assets[flower.image], join(temporaryDirectory, flower.id));
      await stat(image.filePath);
      const storagePath = `builder/flowers/${flowerId}/${mediaId}.${image.extension}`;
      if (!uploadedObjects.has(storagePath)) {
        await npxFrom(
          temporaryDirectory,
          "supabase", "--workdir", REPOSITORY_ROOT, "--experimental", "storage", "cp",
          basename(image.filePath), `ss:///public-media/${storagePath}`, "--linked",
          "--content-type", image.mimeType, "--cache-control", "public, max-age=31536000, immutable",
        );
      }
      flowerRecords.push({ flower, flowerId, image, storagePath });
    }
    const sqlPath = join(temporaryDirectory, "builder-seed.sql");
    await writeFile(sqlPath, buildSeedSql({ ...fixture, flowerRecords }), "utf8");
    const result = await npx("supabase", "db", "query", "--linked", "--file", sqlPath, "--output-format", "json");
    console.log(`Seeded ${flowerRecords.length} flowers, ${fixture.wrappingTypes.length} wrapping types, and ${fixture.wrappingVariants.length} wrapping colors.`);
    console.log(result);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
