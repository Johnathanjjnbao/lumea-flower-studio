import { useCallback, useEffect, useState } from "react";
import type { Locale } from "../../types/content";
import type { HomepageContent } from "./types";
import { invalidateHomepageCache, loadHomepageContent } from "./data/storefrontHomepage";

type HomepageState =
  | { status: "loading"; data: null }
  | { status: "success"; data: HomepageContent }
  | { status: "error"; data: null };

export function useHomepageContent(locale: Locale) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<HomepageState>({ status: "loading", data: null });

  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: null });
    void loadHomepageContent(locale, attempt > 0).then(
      (data) => { if (active) setState({ status: "success", data }); },
      () => { if (active) setState({ status: "error", data: null }); },
    );
    return () => { active = false; };
  }, [attempt, locale]);

  const retry = useCallback(() => {
    invalidateHomepageCache();
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}
