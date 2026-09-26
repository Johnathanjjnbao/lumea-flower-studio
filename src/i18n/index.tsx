import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ko } from "./ko";
import type { DictionaryShape } from "./types";
import type { Locale } from "../types/content";
import { vi } from "./vi";

export type Translations = DictionaryShape<typeof vi>;

const dictionaries: Record<Locale, Translations> = { vi, ko };

export function getLocaleFromPathname(pathname: string): Locale {
  return pathname === "/ko" || pathname.startsWith("/ko/") ? "ko" : "vi";
}

export function stripLocalePrefix(pathname: string) {
  if (pathname === "/ko") return "/";
  if (pathname.startsWith("/ko/")) return pathname.slice(3) || "/";
  return pathname || "/";
}

export function localizePath(locale: Locale, target: string) {
  const hashIndex = target.indexOf("#");
  const queryIndex = target.indexOf("?");
  const suffixIndex = [hashIndex, queryIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? target.length;
  const pathname = stripLocalePrefix(target.slice(0, suffixIndex) || "/");
  const suffix = target.slice(suffixIndex);
  const localizedPathname = locale === "ko" ? (pathname === "/" ? "/ko" : `/ko${pathname}`) : pathname;
  return `${localizedPathname}${suffix}`;
}

export function formatMessage(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  path: (target: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const locale = getLocaleFromPathname(location.pathname);
  const value = useMemo<I18nContextValue>(() => ({
    locale,
    t: dictionaries[locale],
    path: (target) => localizePath(locale, target),
  }), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
