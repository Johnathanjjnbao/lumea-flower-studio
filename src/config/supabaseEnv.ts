export interface SupabasePublicEnv {
  url: string;
  publishableKey: string;
}

type PublicEnvSource = Readonly<Record<string, string | boolean | undefined>>;

function validateSupabaseUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("VITE_SUPABASE_URL must be a valid URL.");
  }

  const localHost = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !(localHost && url.protocol === "http:")) {
    throw new Error("VITE_SUPABASE_URL must use HTTPS outside local development.");
  }

  return url.toString().replace(/\/$/, "");
}

export function readSupabasePublicEnv(source: PublicEnvSource = import.meta.env) {
  const url = typeof source.VITE_SUPABASE_URL === "string"
    ? source.VITE_SUPABASE_URL.trim()
    : undefined;
  const publishableKey = typeof source.VITE_SUPABASE_PUBLISHABLE_KEY === "string"
    ? source.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
    : undefined;

  if (!url && !publishableKey) return null;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase configuration is incomplete. Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  if (!publishableKey.startsWith("sb_publishable_")) {
    throw new Error(
      "VITE_SUPABASE_PUBLISHABLE_KEY must contain a browser-safe sb_publishable_ key. Never use a secret or service-role key.",
    );
  }

  return {
    url: validateSupabaseUrl(url),
    publishableKey,
  } satisfies SupabasePublicEnv;
}
