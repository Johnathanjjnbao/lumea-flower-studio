import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicEnv } from "../config/supabaseEnv";
import type { Database } from "../types/database.generated";

let browserClient: SupabaseClient<Database> | null | undefined;
let publicBrowserClient: SupabaseClient<Database> | null | undefined;

export function getSupabaseClient() {
  if (browserClient !== undefined) return browserClient;

  const config = readSupabasePublicEnv();
  browserClient = config
    ? createClient<Database>(config.url, config.publishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;

  return browserClient;
}

export function requireSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured for this build. Copy .env.example to .env.local and add the browser-safe project values.",
    );
  }

  return client;
}

export function getPublicSupabaseClient() {
  if (publicBrowserClient !== undefined) return publicBrowserClient;

  const config = readSupabasePublicEnv();
  publicBrowserClient = config
    ? createClient<Database>(config.url, config.publishableKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      })
    : null;

  return publicBrowserClient;
}

export function requirePublicSupabaseClient() {
  const client = getPublicSupabaseClient();
  if (!client) {
    throw new Error("The public catalog data source is not configured for this build.");
  }

  return client;
}
