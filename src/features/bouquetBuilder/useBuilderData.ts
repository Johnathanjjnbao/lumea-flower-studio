import { useCallback, useEffect, useState } from "react";
import type { Locale } from "../../types/content";
import { invalidateBuilderCache, loadPublishedBuilder } from "./storefrontBuilder";
import type { BouquetBuilderCatalog } from "./types";

type BuilderDataState =
  | { status: "loading"; data: null }
  | { status: "success"; data: BouquetBuilderCatalog }
  | { status: "error"; data: null };

export function useBuilderData(locale: Locale) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<BuilderDataState>({ status: "loading", data: null });
  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: null });
    void loadPublishedBuilder(locale).then(
      (data) => { if (active) setState({ status: "success", data }); },
      () => { if (active) setState({ status: "error", data: null }); },
    );
    return () => { active = false; };
  }, [attempt, locale]);
  const retry = useCallback(() => {
    invalidateBuilderCache();
    setAttempt((value) => value + 1);
  }, []);
  return { ...state, retry };
}
