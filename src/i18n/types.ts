import type { Locale } from "../types/content";

export type { Locale };

export type DictionaryShape<T> =
  T extends string ? string
    : T extends readonly unknown[] ? { readonly [K in keyof T]: DictionaryShape<T[K]> }
      : T extends object ? { readonly [K in keyof T]: DictionaryShape<T[K]> }
        : T;

export const supportedLocales: readonly Locale[] = ["vi", "ko"];
