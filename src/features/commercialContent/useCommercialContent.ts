import { useEffect, useState } from "react";
import type { Locale } from "../../types/content";
import { loadPublishedCommercialContent } from "./storefrontCommercialContent";
import type { PublishedCommercialContent } from "./types";

export type CommercialContentState =
  | { status: "loading"; data: PublishedCommercialContent[] }
  | { status: "success"; data: PublishedCommercialContent[] }
  | { status: "error"; data: PublishedCommercialContent[]; retry: () => void };

export function useCommercialContent(locale: Locale): CommercialContentState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CommercialContentState>({ status: "loading", data: [] });

  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: [] });
    void loadPublishedCommercialContent(locale, attempt > 0).then(
      (data) => { if (active) setState({ status: "success", data }); },
      () => { if (active) setState({ status: "error", data: [], retry: () => setAttempt((value) => value + 1) }); },
    );
    return () => { active = false; };
  }, [attempt, locale]);

  return state;
}
