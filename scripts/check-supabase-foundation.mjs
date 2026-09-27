import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return separator === -1
          ? [line, ""]
          : [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
const url = env.VITE_SUPABASE_URL;
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

assert(url?.includes("nihhynwvltttadlfatdm.supabase.co"), "The local URL does not target the Luméa project.");
assert(publishableKey?.startsWith("sb_publishable_"), "A browser-safe publishable key is required.");
assert(!Object.keys(env).some((key) => /service.?role|secret/i.test(key)), "Server-only credentials must not be stored in .env.local.");

const client = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const publicRead = await client.from("products").select("id, slug").limit(1);
assert(!publicRead.error, `Anonymous published-product read failed (${publicRead.error?.code ?? "unknown"}).`);

const probe = randomUUID();
const anonymousInsert = await client.from("products").insert({
  stable_code: `rls-probe-${probe}`,
  slug: `rls-probe-${probe}`,
  product_type: "READY_MADE_BOUQUET",
  visibility: "DRAFT",
});
assert(Boolean(anonymousInsert.error), "Anonymous product insert unexpectedly succeeded.");

const privateList = await client.storage.from("private-uploads").list("", { limit: 1 });
assert((privateList.data?.length ?? 0) === 0, "Anonymous access exposed private upload metadata.");

console.log("Supabase foundation check passed: public read available, anonymous write denied, private uploads hidden.");
