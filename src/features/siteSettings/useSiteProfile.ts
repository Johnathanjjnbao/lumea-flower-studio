import { useEffect, useState } from "react";
import type { SiteProfile } from "./types";
import { createSiteProfileRepository } from "./repository";
import { reviewMode } from "../../review/mode";
import { reviewSiteProfile } from "../../review/fixtures";

const repository = reviewMode ? null : createSiteProfileRepository();
let cached: Promise<SiteProfile> | null = null;

function loadSiteProfile() {
  if (reviewMode) return Promise.resolve(reviewSiteProfile);
  cached ??= repository!.getProfile();
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
