import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { ProductCard } from "../components/ProductCard";
import { usePublishedCatalog } from "../features/catalog/useCatalogData";
import { isSameDayAvailable, loadCheckoutOptions } from "../features/checkout/options";
import type { CheckoutOptions } from "../features/checkout/types";
import { businessTimeInVietnam } from "../features/checkout/validation";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useI18n } from "../i18n";

export function SameDayPage() {
  const { locale, path, t } = useI18n();
  const catalog = usePublishedCatalog(locale);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [requestVersion, setRequestVersion] = useState(0);
  const [businessTime, setBusinessTime] = useState(() => businessTimeInVietnam());
  useDocumentMetadata(t.meta.sameDayTitle, t.meta.sameDayDescription);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    void loadCheckoutOptions(locale).then(
      (value) => { if (active) { setOptions(value); setStatus("ready"); } },
      () => { if (active) setStatus("error"); },
    );
    return () => { active = false; };
  }, [locale, requestVersion]);
  useEffect(() => {
    const timer = window.setInterval(() => setBusinessTime(businessTimeInVietnam()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const available = status === "ready" && isSameDayAvailable(options, businessTime);
  const products = catalog.status === "success"
    ? catalog.data.filter((product) => product.availability === "AVAILABLE" && product.sameDayEligible)
    : [];
  const zones = options?.zones.filter((zone) => zone.sameDayEligible && zone.areas.length > 0) ?? [];

  return <PageFrame><div className="editorial-page section-shell section-space">
    <header className="editorial-heading">
      <p className="eyebrow">{t.sameDayPage.eyebrow}</p>
      <h1>{t.sameDayPage.title}</h1>
      <p>{t.sameDayPage.intro}</p>
    </header>
    <div className="same-day-status" role="status" aria-live="polite" data-available={available}>
      <strong>{status === "loading" ? t.home.sameDay.statusChecking : status === "error" ? t.sameDayPage.error : available ? t.sameDayPage.available : t.home.sameDay.unavailable}</strong>
      <p>{t.sameDayPage.caveat}</p>
      {status === "error" && <button className="button button--outline" type="button" onClick={() => setRequestVersion((version) => version + 1)}>{t.catalog.retry}</button>}
    </div>
    {available && <div className="same-day-facts">
      {options?.sameDayCutoff && <p><strong>{t.sameDayPage.cutoff}</strong><span>{options.sameDayCutoff.slice(0, 5)}</span></p>}
      {zones.length > 0 && <p><strong>{t.sameDayPage.zones}</strong><span>{zones.map((zone) => zone.name).join(", ")}</span></p>}
    </div>}
    <nav className="editorial-actions" aria-label={t.sameDayPage.nextSteps}>
      <Link className="button button--solid" to={path(available ? "/flowers?sameDay=true" : "/flowers")}>{available ? t.sameDayPage.browse : t.sameDayPage.browseAll}</Link>
      <Link className="text-link" to={path("/contact")}>{t.sameDayPage.contact}</Link>
    </nav>
    {available && <section className="same-day-products" aria-labelledby="same-day-products-title">
      <h2 id="same-day-products-title">{t.sameDayPage.products}</h2>
      {catalog.status === "loading" ? <p aria-busy="true">{t.catalog.loading}</p>
        : catalog.status === "error" ? <div role="alert"><p>{t.catalog.errorText}</p><button className="button button--outline" type="button" onClick={catalog.retry}>{t.catalog.retry}</button></div>
        : products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard product={product} headingLevel={3} showAvailability showStartingPrice key={product.id} />)}</div>
        : <p>{t.sameDayPage.noProducts}</p>}
    </section>}
  </div></PageFrame>;
}
