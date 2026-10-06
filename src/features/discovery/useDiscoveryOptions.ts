import { useCallback, useEffect, useState } from "react";
import type { Locale } from "../../types/content";
import type { DiscoveryOptions } from "./types";
import { invalidateDiscoveryOptions, loadDiscoveryOptions } from "./storefrontDiscovery";

type State = { status: "loading"; data: null } | { status: "success"; data: DiscoveryOptions } | { status: "error"; data: null };

export function useDiscoveryOptions(locale: Locale) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: "loading", data: null });
  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: null });
    void loadDiscoveryOptions(locale, attempt > 0).then(
      (data) => { if (active) setState({ status: "success", data }); },
      () => { if (active) setState({ status: "error", data: null }); },
    );
    return () => { active = false; };
  }, [attempt, locale]);
  const retry = useCallback(() => { invalidateDiscoveryOptions(); setAttempt((value) => value + 1); }, []);
  return { ...state, retry };
}
