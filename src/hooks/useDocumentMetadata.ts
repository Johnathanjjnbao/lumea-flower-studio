import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { localizePath, stripLocalePrefix, useI18n } from "../i18n";

export function useDocumentMetadata(title: string, description: string) {
  const location = useLocation();
  const { locale } = useI18n();

  useEffect(() => {
    document.title = title;
    const descriptionElement = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    descriptionElement?.setAttribute("content", description);

    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const routePath = stripLocalePrefix(location.pathname);
    const absoluteUrl = (targetLocale: "vi" | "ko") => `${window.location.origin}${basePath}${localizePath(targetLocale, routePath)}`;
    const setLink = (selector: string, attributes: Record<string, string>) => {
      let link = document.head.querySelector<HTMLLinkElement>(selector);
      if (!link) {
        link = document.createElement("link");
        document.head.append(link);
      }
      Object.entries(attributes).forEach(([name, value]) => link?.setAttribute(name, value));
    };

    setLink('link[rel="canonical"]', { rel: "canonical", href: absoluteUrl(locale) });
    setLink('link[rel="alternate"][hreflang="vi"]', { rel: "alternate", hreflang: "vi", href: absoluteUrl("vi") });
    setLink('link[rel="alternate"][hreflang="ko"]', { rel: "alternate", hreflang: "ko", href: absoluteUrl("ko") });
    setLink('link[rel="alternate"][hreflang="x-default"]', { rel: "alternate", hreflang: "x-default", href: absoluteUrl("vi") });
  }, [description, locale, location.pathname, title]);
}
