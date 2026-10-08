import { useCallback, useEffect, useState } from "react";
import type { Locale } from "../../types/content";
import type { CatalogCategoryRecord, CatalogProductRecord } from "./data/catalogRepository";
import {
  invalidateCatalogCache,
  loadPublishedCategories,
  loadPublishedCatalog,
  loadPublishedProduct,
} from "./data/storefrontCatalog";

type CatalogState<T> =
  | { status: "loading"; data: null }
  | { status: "success"; data: T }
  | { status: "error"; data: null };

function useCatalogRequest<T>(request: () => Promise<T>, requestKey: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogState<T>>({ status: "loading", data: null });

  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: null });
    void request().then(
      (data) => {
        if (active) setState({ status: "success", data });
      },
      () => {
        if (active) setState({ status: "error", data: null });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, request, requestKey]);

  const retry = useCallback(() => {
    invalidateCatalogCache();
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, retry };
}

export function usePublishedCatalog(locale: Locale) {
  const request = useCallback(() => loadPublishedCatalog(locale), [locale]);
  return useCatalogRequest<CatalogProductRecord[]>(request, locale);
}

export function usePublishedCategories(locale: Locale) {
  const request = useCallback(() => loadPublishedCategories(locale), [locale]);
  return useCatalogRequest<CatalogCategoryRecord[]>(request, `categories:${locale}`);
}

export function usePublishedProduct(slug: string, locale: Locale) {
  const request = useCallback(() => loadPublishedProduct(slug, locale), [locale, slug]);
  return useCatalogRequest<CatalogProductRecord | null>(request, `${locale}:${slug}`);
}
