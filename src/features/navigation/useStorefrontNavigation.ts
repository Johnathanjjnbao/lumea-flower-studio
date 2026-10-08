import { useEffect, useState } from "react";
import type { Locale } from "../../types/content";
import { loadStorefrontNavigation } from "./storefrontNavigation";
import type { StorefrontNavigationItem } from "./types";

export function useStorefrontNavigation(locale: Locale) {
  const [state, setState] = useState<{ status: "loading" | "success" | "error"; items: StorefrontNavigationItem[] }>({ status: "loading", items: [] });
  useEffect(() => {
    let active = true;
    setState({ status: "loading", items: [] });
    void loadStorefrontNavigation(locale).then(
      (value) => { if (active) setState({ status: "success", items: value }); },
      () => { if (active) setState({ status: "error", items: [] }); },
    );
    return () => { active = false; };
  }, [locale]);
  return state;
}
