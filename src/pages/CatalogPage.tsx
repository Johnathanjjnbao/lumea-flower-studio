import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { ProductCard } from "../components/ProductCard";
import { occasions, products } from "../data/content";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useImagePipeline } from "../hooks/useImagePipeline";
import { formatMessage, useI18n } from "../i18n";
import {
  availabilityFilterOptions,
  budgetFilterOptions,
  filterCatalogProducts,
  getRepresentedOccasions,
  readCatalogDiscoveryState,
} from "../utils/catalogDiscovery";

type FilterParam = "q" | "occasion" | "budget" | "sameDay" | "availability";

export function CatalogPage() {
  const { locale, t } = useI18n();
  const pageRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const representedOccasions = useMemo(() => getRepresentedOccasions(products, occasions), []);
  const validOccasionIds = useMemo(() => new Set(representedOccasions.map((occasion) => occasion.id)), [representedOccasions]);
  const discoveryState = readCatalogDiscoveryState(searchParams, validOccasionIds);
  const visibleProducts = filterCatalogProducts(products, discoveryState, t, locale);
  const searchParamKey = searchParams.toString();

  useImagePipeline(pageRef, {
    observe: "images",
    prioritySelector: undefined,
    preloadMargin: "600px 0px",
    refreshKey: searchParamKey,
  });
  useDocumentMetadata(
    t.meta.catalogTitle,
    t.meta.catalogDescription,
  );

  const updateFilter = (name: FilterParam, value: string | null, replace = false) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    setSearchParams(next, { replace });
  };

  const clearFilters = () => setSearchParams({});

  const closeFilters = (restoreFocus = false) => {
    setFiltersOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => filterButtonRef.current?.focus());
  };

  const openFilters = () => {
    setFiltersOpen(true);
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!filtersOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFilters(true);
    };
    document.body.classList.add("catalog-filter-open");
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("catalog-filter-open");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [filtersOpen]);

  const activeFilters = [
    discoveryState.query.trim() ? { key: "q" as const, label: formatMessage(t.catalog.searchChip, { query: discoveryState.query.trim() }) } : null,
    discoveryState.occasion ? {
      key: "occasion" as const,
      label: representedOccasions.find((occasion) => occasion.id === discoveryState.occasion) ? t.occasions[discoveryState.occasion as keyof typeof t.occasions].name : discoveryState.occasion,
    } : null,
    discoveryState.budget ? {
      key: "budget" as const,
      label: t.catalog.budgetLabels[discoveryState.budget],
    } : null,
    discoveryState.sameDay ? { key: "sameDay" as const, label: t.catalog.sameDay } : null,
    discoveryState.availability ? {
      key: "availability" as const,
      label: t.product.availability[availabilityFilterOptions.find((option) => option.id === discoveryState.availability)?.value ?? "AVAILABLE"],
    } : null,
  ].filter((filter): filter is { key: FilterParam; label: string } => Boolean(filter));

  const structuredFilterCount = activeFilters.filter((filter) => filter.key !== "q").length;

  return (
    <PageFrame pageRef={pageRef}>
      <section className="catalog-page" aria-labelledby="catalog-title">
        <div className="catalog-intro">
          <header className="catalog-heading section-shell">
            <div>
              <p className="eyebrow"><span aria-hidden="true">01</span>{t.catalog.eyebrow}</p>
              <h1 id="catalog-title">{t.catalog.titleOne}<br />{t.catalog.titleTwo}</h1>
            </div>
            <div className="catalog-heading__meta">
              <p>{t.catalog.intro}</p>
            </div>
          </header>
        </div>

        <div className="catalog-commerce">
          <div className="section-shell">
            <div className="catalog-discovery">
            <div className="catalog-search">
              <label htmlFor="catalog-search">{t.catalog.searchLabel}</label>
              <div className="catalog-search__field">
                <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 4.2 4.2" /></svg>
                <input
                  id="catalog-search"
                  type="search"
                  value={discoveryState.query}
                  placeholder={t.catalog.searchPlaceholder}
                  onChange={(event) => updateFilter("q", event.target.value, true)}
                />
                {discoveryState.query && (
                  <button type="button" onClick={() => updateFilter("q", null, true)} aria-label={t.catalog.clearSearch}>{t.catalog.clear}</button>
                )}
              </div>
            </div>

            <button
              ref={filterButtonRef}
              className="catalog-filter-toggle"
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="catalog-filter-panel"
              onClick={openFilters}
            >
              <span>{t.catalog.filter}{structuredFilterCount ? ` (${structuredFilterCount})` : ""}</span>
              <span aria-hidden="true">＋</span>
            </button>

            <button
              className="catalog-filter-backdrop"
              type="button"
              aria-label={t.catalog.closeFilter}
              data-open={filtersOpen}
              onClick={() => closeFilters(true)}
            />

            <div className="catalog-filter-panel" id="catalog-filter-panel" data-open={filtersOpen} role="region" aria-label={t.catalog.filterAria}>
              <div className="catalog-filter-panel__head">
                <div><span>{t.catalog.refine}</span><strong>{t.catalog.filter}</strong></div>
                <button ref={closeButtonRef} type="button" onClick={() => closeFilters(true)} aria-label={t.catalog.closeFilter}>×</button>
              </div>

              <fieldset className="catalog-filter-group">
                <legend>{t.catalog.occasion}</legend>
                <div className="catalog-filter-options">
                  {representedOccasions.map((occasion) => (
                    <label key={occasion.id} data-selected={discoveryState.occasion === occasion.id}>
                      <input
                        type="radio"
                        name="occasion"
                        value={occasion.id}
                        checked={discoveryState.occasion === occasion.id}
                        onChange={() => updateFilter("occasion", occasion.id)}
                      />
                      <span>{t.occasions[occasion.id].name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="catalog-filter-group">
                <legend>{t.catalog.budget}</legend>
                <div className="catalog-filter-options">
                  {budgetFilterOptions.map((option) => (
                    <label key={option.id} data-selected={discoveryState.budget === option.id}>
                      <input
                        type="radio"
                        name="budget"
                        value={option.id}
                        checked={discoveryState.budget === option.id}
                        onChange={() => updateFilter("budget", option.id)}
                      />
                      <span>{t.catalog.budgetLabels[option.id]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="catalog-filter-group catalog-filter-group--compact">
                <legend>{t.catalog.fulfillment}</legend>
                <div className="catalog-filter-options">
                  <label data-selected={discoveryState.sameDay}>
                    <input
                      type="checkbox"
                      checked={discoveryState.sameDay}
                      onChange={(event) => updateFilter("sameDay", event.target.checked ? "true" : null)}
                    />
                    <span>{t.catalog.sameDay}</span>
                  </label>
                  {availabilityFilterOptions.map((option) => (
                    <label key={option.id} data-selected={discoveryState.availability === option.id}>
                      <input
                        type="radio"
                        name="availability"
                        value={option.id}
                        checked={discoveryState.availability === option.id}
                        onChange={() => updateFilter("availability", option.id)}
                      />
                      <span>{t.product.availability[option.value]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="catalog-filter-panel__actions">
                {activeFilters.length > 0 && <button type="button" onClick={clearFilters}>{t.catalog.clearFilters}</button>}
                <button className="button button--solid" type="button" onClick={() => closeFilters(true)}>
                  {formatMessage(t.catalog.viewResults, { count: visibleProducts.length })}
                </button>
              </div>
            </div>

            <div className="catalog-results-head">
              <p className="catalog-count" aria-live="polite">
                <strong>{visibleProducts.length}</strong> {activeFilters.length ? t.catalog.resultFiltered : t.catalog.resultAll}
              </p>
              {activeFilters.length > 0 && (
                <div className="active-filters" aria-label={t.catalog.activeAria}>
                  {activeFilters.map((filter) => (
                    <button type="button" key={filter.key} onClick={() => updateFilter(filter.key, null)} aria-label={formatMessage(t.catalog.removeFilter, { label: filter.label })}>
                      <span>{filter.label}</span><span aria-hidden="true">×</span>
                    </button>
                  ))}
                  <button className="active-filters__clear" type="button" onClick={clearFilters}>{t.catalog.clearFilters}</button>
                </div>
              )}
            </div>
            </div>

            {visibleProducts.length > 0 ? (
              <div className="product-grid catalog-grid">
                {visibleProducts.map((product) => <ProductCard product={product} headingLevel={2} showAvailability showStartingPrice key={product.id} />)}
              </div>
            ) : (
              <div className="catalog-empty">
                <p className="eyebrow"><span aria-hidden="true">0</span>{t.catalog.emptyEyebrow}</p>
                <h2>{t.catalog.emptyTitle}</h2>
                <p>{t.catalog.emptyText}</p>
                <button className="button button--solid" type="button" onClick={clearFilters}>{t.catalog.clearFilters}</button>
              </div>
            )}
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
