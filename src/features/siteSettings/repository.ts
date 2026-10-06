import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseClient, requireSupabaseClient } from "../../lib/supabase";
import type { SiteProfile } from "./types";
import { emptySiteProfile } from "./types";
import { validateSiteProfile } from "./validation";

type SiteProfileRow = {
  business_name: string;
  phone: string | null;
  email: string | null;
  instagram_url: string | null;
  instagram_handle: string | null;
};

function mapProfile(row: SiteProfileRow | null): SiteProfile {
  if (!row) return emptySiteProfile();
  return {
    businessName: row.business_name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    instagramUrl: row.instagram_url ?? "",
    instagramHandle: row.instagram_handle ?? "",
  };
}

export class SiteProfileRepository {
  constructor(protected readonly client: SupabaseClient<any> = requirePublicSupabaseClient() as SupabaseClient<any>) {}

  async getProfile() {
    const { data, error } = await this.client.from("site_profile").select("business_name, phone, email, instagram_url, instagram_handle").eq("singleton", true).maybeSingle();
    if (error) throw new Error(`SITE_PROFILE_LOAD_FAILED:${error.code}`);
    return mapProfile(data as SiteProfileRow | null);
  }
}

export class AdminSiteProfileRepository extends SiteProfileRepository {
  constructor(client: SupabaseClient<any> = requireSupabaseClient() as SupabaseClient<any>) { super(client); }

  async saveProfile(profile: SiteProfile) {
    const errors = Object.values(validateSiteProfile(profile));
    if (errors.length) throw new Error("SITE_PROFILE_INVALID");
    const nullable = (value: string) => value.trim() || null;
    const { error } = await this.client.from("site_profile").upsert({
      singleton: true,
      business_name: profile.businessName.trim(),
      phone: nullable(profile.phone),
      email: nullable(profile.email.toLowerCase()),
      instagram_url: nullable(profile.instagramUrl),
      instagram_handle: nullable(profile.instagramHandle),
    }, { onConflict: "singleton" });
    if (error) throw new Error(`SITE_PROFILE_SAVE_FAILED:${error.code}`);
  }
}

export const createSiteProfileRepository = () => new SiteProfileRepository();
export const createAdminSiteProfileRepository = () => new AdminSiteProfileRepository();
