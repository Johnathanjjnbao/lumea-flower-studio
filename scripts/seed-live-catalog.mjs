import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { createServer } from "vite";

const EXPECTED_PROJECT_REF = "nihhynwvltttadlfatdm";
const SEED_NAMESPACE = "lumea-live-catalog-v1";
const REPOSITORY_ROOT = process.cwd();
const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

function run(command, args, cwd = REPOSITORY_ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
    });
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

function sqlTextArray(values) {
  return `array[${values.map(sql).join(", ")}]::text[]`;
}

async function loadFixture() {
  const vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const [{ products }, { assets }, { vi }, { ko }] = await Promise.all([
      vite.ssrLoadModule("/src/data/content.ts"),
      vite.ssrLoadModule("/src/data/assets.ts"),
      vite.ssrLoadModule("/src/i18n/vi.ts"),
      vite.ssrLoadModule("/src/i18n/ko.ts"),
    ]);
    return { products, assets, dictionaries: { vi, ko } };
  } finally {
    await vite.close();
  }
}

async function verifyLinkedProject() {
  const output = await npx("supabase", "projects", "list", "--output", "json");
  const projects = JSON.parse(output);
  const linked = projects.find((project) => project.linked);
  if (!linked || linked.ref !== EXPECTED_PROJECT_REF || linked.name !== "lumea-flower-studio") {
    throw new Error(`Refusing to seed unexpected linked project: ${linked?.ref ?? "none"}.`);
  }
}

async function listUploadedObjects() {
  const output = await npx(
    "supabase",
    "--experimental",
    "storage",
    "ls",
    "-r",
    "ss:///public-media/products",
    "--linked",
    "--output-format",
    "json",
  );
  const result = JSON.parse(output);
  return new Set((result.paths ?? []).map((path) => path.replace(/^\/public-media\//, "")));
}

async function downloadImage(sourceUrl, destinationBase) {
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "LumeaCatalogMigration/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Unable to download current product image (${response.status}) from ${new URL(sourceUrl).hostname}.`);

  const mimeType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  const extension = mimeType ? ALLOWED_MIME_TYPES.get(mimeType) : undefined;
  if (!mimeType || !extension) throw new Error(`Unsupported product image type: ${mimeType ?? "unknown"}.`);

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error("Downloaded product image is empty.");
  const filePath = `${destinationBase}.${extension}`;
  await writeFile(filePath, bytes);
  return {
    byteSize: bytes.length,
    checksum: createHash("sha256").update(bytes).digest("hex"),
    extension,
    filePath,
    mimeType,
  };
}

function buildSeedSql(records) {
  const productValues = records.map(({ product, productId }, index) => `(
    ${sql(productId)}, ${sql(product.id)}, ${sql(product.slug)}, 'READY_MADE_BOUQUET', 'DRAFT',
    ${sql(product.availability)}, ${sql(product.sameDayEligible)}, ${sql(product.featured ?? false)},
    ${sql(product.tag === "bestseller")}, ${index * 10}
  )`).join(",\n");

  const translationValues = records.flatMap(({ product, dictionaries }) => ["vi", "ko"].map((locale) => {
    const copy = dictionaries[locale];
    return `(${sql(product.id)}, ${sql(locale)}, ${sql(product.name)}, ${sql(copy.shortDescription)}, ${sql(copy.description)}, ${sqlTextArray(copy.composition)})`;
  })).join(",\n");

  const variantValues = records.flatMap(({ product, dictionaries }) => product.sizes.map((variant, index) => {
    const variantId = deterministicUuid(`variant:${product.id}:${variant.id}`);
    return `(${sql(variantId)}, ${sql(product.id)}, ${sql(variant.id)}, ${product.basePrice + variant.priceDelta}, ${index * 10})`;
  })).join(",\n");

  const variantTranslationValues = records.flatMap(({ product, dictionaries }) => product.sizes.flatMap((variant) => ["vi", "ko"].map((locale) => {
    const copy = dictionaries[locale].sizes[variant.id];
    return `(${sql(deterministicUuid(`variant:${product.id}:${variant.id}`))}, ${sql(locale)}, ${sql(copy.label)}, ${sql(copy.description)})`;
  }))).join(",\n");

  const mediaValues = records.map(({ mediaId, storagePath, image }) => `(
    ${sql(mediaId)}, 'public-media', ${sql(storagePath)}, 'PUBLIC', ${sql(image.mimeType)},
    ${image.byteSize}, ${sql(image.checksum)}, 'ACTIVE'
  )`).join(",\n");

  const mediaTranslationValues = records.flatMap(({ product, dictionaries, mediaId }) => ["vi", "ko"].map((locale) => {
    const altText = dictionaries[locale].imageAlts[0] ?? product.name;
    return `(${sql(mediaId)}, ${sql(locale)}, ${sql(altText)})`;
  })).join(",\n");

  const imageValues = records.map(({ product, mediaId }) => `(
    ${sql(deterministicUuid(`product-image:${product.id}:primary`))}, ${sql(product.id)}, ${sql(mediaId)}
  )`).join(",\n");

  const occasionValues = records.flatMap(({ product }) => product.occasionIds.map((occasionCode, index) => (
    `(${sql(product.id)}, ${sql(occasionCode)}, ${index * 10})`
  ))).join(",\n");

  const toneValues = records.flatMap(({ product }) => product.tones.map((tone, index) => (
    `(${sql(product.id)}, ${sql(tone.id)}, ${index * 10})`
  ))).join(",\n");

  const stableCodes = records.map(({ product }) => sql(product.id)).join(", ");

  return `begin;

insert into public.products (
  id, stable_code, slug, product_type, visibility, availability,
  same_day_eligible, featured, bestseller, sort_order
) values
${productValues}
on conflict (stable_code) do nothing;

insert into public.product_translations (
  product_id, locale, name, short_description, description, composition
)
select product.id, source.locale::public.locale_code, source.name, source.short_description, source.description, source.composition
from (values
${translationValues}
) as source(stable_code, locale, name, short_description, description, composition)
join public.products product on product.stable_code = source.stable_code
on conflict (product_id, locale) do nothing;

insert into public.product_variants (id, product_id, stable_code, price_amount, active, sort_order)
select source.id::uuid, product.id, source.variant_code, source.price_amount, true, source.sort_order
from (values
${variantValues}
) as source(id, product_code, variant_code, price_amount, sort_order)
join public.products product on product.stable_code = source.product_code
on conflict (product_id, stable_code) do nothing;

insert into public.product_variant_translations (product_variant_id, locale, name, description)
values
${variantTranslationValues}
on conflict (product_variant_id, locale) do nothing;

insert into public.media_assets (
  id, storage_bucket, storage_path, access, mime_type, byte_size, checksum, status
) values
${mediaValues}
on conflict (storage_bucket, storage_path) do nothing;

insert into public.media_asset_translations (media_asset_id, locale, alt_text)
values
${mediaTranslationValues}
on conflict (media_asset_id, locale) do nothing;

insert into public.product_images (id, product_id, media_asset_id, role, sort_order, active)
select source.id::uuid, product.id, source.media_id::uuid, 'PRIMARY', 0, true
from (values
${imageValues}
) as source(id, product_code, media_id)
join public.products product on product.stable_code = source.product_code
on conflict (product_id, media_asset_id) do nothing;

insert into public.product_occasions (product_id, occasion_id, sort_order)
select product.id, occasion.id, source.sort_order
from (values
${occasionValues}
) as source(product_code, occasion_code, sort_order)
join public.products product on product.stable_code = source.product_code
join public.occasions occasion on occasion.stable_code = source.occasion_code
on conflict (product_id, occasion_id) do nothing;

insert into public.product_tones (product_id, tone_id, sort_order, active)
select product.id, tone.id, source.sort_order, true
from (values
${toneValues}
) as source(product_code, tone_code, sort_order)
join public.products product on product.stable_code = source.product_code
join public.tones tone on tone.stable_code = source.tone_code
on conflict (product_id, tone_id) do nothing;

update public.products
set visibility = 'PUBLISHED'
where stable_code in (${stableCodes})
  and visibility = 'DRAFT';

commit;

select
  count(*) filter (where visibility = 'PUBLISHED')::int as published_products,
  count(*) filter (where visibility = 'ARCHIVED')::int as archived_products
from public.products;
`;
}

async function main() {
  await verifyLinkedProject();
  const { products, assets, dictionaries } = await loadFixture();
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "lumea-catalog-seed-"));

  try {
    const uploadedObjects = await listUploadedObjects();
    const records = [];

    for (const product of products) {
      const productId = deterministicUuid(`product:${product.id}`);
      const mediaId = deterministicUuid(`media:${product.id}:primary`);
      const sourceUrl = assets[product.images[0].asset];
      const image = await downloadImage(sourceUrl, join(temporaryDirectory, product.id));
      await stat(image.filePath);
      const storagePath = `products/${productId}/${mediaId}.${image.extension}`;

      if (!uploadedObjects.has(storagePath)) {
        await npxFrom(
          temporaryDirectory,
          "supabase",
          "--workdir",
          REPOSITORY_ROOT,
          "--experimental",
          "storage",
          "cp",
          basename(image.filePath),
          `ss:///public-media/${storagePath}`,
          "--linked",
          "--content-type",
          image.mimeType,
          "--cache-control",
          "public, max-age=31536000, immutable",
        );
      }

      records.push({
        dictionaries: {
          vi: { ...dictionaries.vi.products[product.id], sizes: dictionaries.vi.product.sizes },
          ko: { ...dictionaries.ko.products[product.id], sizes: dictionaries.ko.product.sizes },
        },
        image,
        mediaId,
        product,
        productId,
        storagePath,
      });
    }

    const sqlPath = join(temporaryDirectory, "catalog-seed.sql");
    await writeFile(sqlPath, buildSeedSql(records), "utf8");
    const result = await npx(
      "supabase",
      "db",
      "query",
      "--linked",
      "--file",
      sqlPath,
      "--output-format",
      "json",
    );
    console.log(`Seeded ${records.length} catalog products into ${EXPECTED_PROJECT_REF}.`);
    console.log(result);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
