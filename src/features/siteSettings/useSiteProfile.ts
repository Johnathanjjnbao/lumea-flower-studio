import { useEffect, useState } from "react";
import type { SiteProfile } from "./types";
import { createSiteProfileRepository } from "./repository";

const repository = createSiteProfileRepository();
let cached: Promise<SiteProfile> | null = null;

function loadSiteProfile() {
  cached ??= repository.getProfile();
  void cached.catch(() => { cached = null; });
  return cached;
}

export function useSiteProfile() {
  const [profile, setProfile] = useState<SiteProfile | null>(null);
  useEffect(() => {
    let active = true;
    void loadSiteProfile().then((value) => { if (active) setProfile(value); }, () => { if (active) setProfile(null); });
    return () => { active = false; };
  }, []);
  return profile;
}

export function invalidateSiteProfile() { cached = null; }
