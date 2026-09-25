import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { ProductCard } from "../components/ProductCard";
import { occasions, products } from "../data/content";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useImagePipeline } from "../hooks/useImagePipeline";
import {
  availabilityFilterOptions,
  budgetFilterOptions,
  filterCatalogProducts,
  getRepresentedOccasions,
  readCatalogDiscoveryState,
} from "../utils/catalogDiscovery";

type FilterParam = "q" | "occasion" | "budget" | "sameDay" | "availability";

export function CatalogPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const representedOccasions = useMemo(() => getRepresentedOccasions(products, occasions), []);
  const validOccasionIds = useMemo(() => new Set(representedOccasions.map((occasion) => occasion.id)), [representedOccasions]);
  const discoveryState = readCatalogDiscoveryState(searchParams, validOccasionIds);
  const visibleProducts = filterCatalogProducts(products, discoveryState, representedOccasions);
  const searchParamKey = searchParams.toString();

  useImagePipeline(pageRef, {
    observe: "images",
    prioritySelector: undefined,
    preloadMargin: "600px 0px",
    refreshKey: searchParamKey,
  });
  useDocumentMetadata(
    "Bộ sưu tập hoa — Luméa Flower Studio",
    "Khám phá những thiết kế hoa thủ công hiện có tại Luméa Flower Studio.",
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
    discoveryState.query.trim() ? { key: "q" as const, label: `Tìm “${discoveryState.query.trim()}”` } : null,
    discoveryState.occasion ? {
      key: "occasion" as const,
      label: representedOccasions.find((occasion) => occasion.id === discoveryState.occasion)?.name ?? discoveryState.occasion,
    } : null,
    discoveryState.budget ? {
      key: "budget" as const,
      label: budgetFilterOptions.find((option) => option.id === discoveryState.budget)?.label ?? discoveryState.budget,
    } : null,
    discoveryState.sameDay ? { key: "sameDay" as const, label: "Giao trong ngày" } : null,
    discoveryState.availability ? {
      key: "availability" as const,
      label: availabilityFilterOptions.find((option) => option.id === discoveryState.availability)?.label ?? discoveryState.availability,
    } : null,
  ].filter((filter): filter is { key: FilterParam; label: string } => Boolean(filter));

  const structuredFilterCount = activeFilters.filter((filter) => filter.key !== "q").length;

  return (
    <PageFrame pageRef={pageRef}>
      <section className="catalog-page section-space" aria-labelledby="catalog-title">
        <div className="section-shell">
          <header className="catalog-heading">
            <div>
              <p className="eyebrow"><span aria-hidden="true">01</span>The collection</p>
              <h1 id="catalog-title">Hoa cho từng điều<br />bạn muốn gửi trao.</h1>
            </div>
            <div className="catalog-heading__meta">
              <p>Những thiết kế hiện có, được kết bằng tay theo sắc độ và vẻ đẹp tự nhiên của hoa trong ngày.</p>
            </div>
          </header>

          <div className="catalog-discovery">
            <div className="catalog-search">
              <label htmlFor="catalog-search">Tìm trong bộ sưu tập</label>
              <div className="catalog-search__field">
                <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 4.2 4.2" /></svg>
                <input
                  id="catalog-search"
                  type="search"
                  value={discoveryState.query}
                  placeholder="Tìm theo tên hoa, dịp tặng..."
                  onChange={(event) => updateFilter("q", event.target.value, true)}
                />
                {discoveryState.query && (
                  <button type="button" onClick={() => updateFilter("q", null, true)} aria-label="Xóa tìm kiếm">Xóa</button>
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
              <span>Bộ lọc{structuredFilterCount ? ` (${structuredFilterCount})` : ""}</span>
              <span aria-hidden="true">＋</span>
            </button>

            <button
              className="catalog-filter-backdrop"
              type="button"
              aria-label="Đóng bộ lọc"
              data-open={filtersOpen}
              onClick={() => closeFilters(true)}
            />

            <div className="catalog-filter-panel" id="catalog-filter-panel" data-open={filtersOpen} role="region" aria-label="Bộ lọc sản phẩm">
              <div className="catalog-filter-panel__head">
                <div><span>Refine the collection</span><strong>Bộ lọc</strong></div>
                <button ref={closeButtonRef} type="button" onClick={() => closeFilters(true)} aria-label="Đóng bộ lọc">×</button>
              </div>

              <fieldset className="catalog-filter-group">
                <legend>Dịp tặng</legend>
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
                      <span>{occasion.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="catalog-filter-group">
                <legend>Ngân sách</legend>
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
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="catalog-filter-group catalog-filter-group--compact">
                <legend>Đáp ứng</legend>
                <div className="catalog-filter-options">
                  <label data-selected={discoveryState.sameDay}>
                    <input
                      type="checkbox"
                      checked={discoveryState.sameDay}
                      onChange={(event) => updateFilter("sameDay", event.target.checked ? "true" : null)}
                    />
                    <span>Giao trong ngày</span>
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
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="catalog-filter-panel__actions">
                {activeFilters.length > 0 && <button type="button" onClick={clearFilters}>Xóa bộ lọc</button>}
                <button className="button button--solid" type="button" onClick={() => closeFilters(true)}>
                  Xem {visibleProducts.length} thiết kế
                </button>
              </div>
            </div>

            <div className="catalog-results-head">
              <p className="catalog-count" aria-live="polite">{visibleProducts.length} thiết kế</p>
              {activeFilters.length > 0 && (
                <div className="active-filters" aria-label="Bộ lọc đang áp dụng">
                  {activeFilters.map((filter) => (
                    <button type="button" key={filter.key} onClick={() => updateFilter(filter.key, null)} aria-label={`Xóa bộ lọc ${filter.label}`}>
                      <span>{filter.label}</span><span aria-hidden="true">×</span>
                    </button>
                  ))}
                  {activeFilters.length > 1 && <button className="active-filters__clear" type="button" onClick={clearFilters}>Xóa bộ lọc</button>}
                </div>
              )}
            </div>
          </div>

          {visibleProducts.length > 0 ? (
            <div className="product-grid catalog-grid">
              {visibleProducts.map((product) => <ProductCard product={product} showAvailability showStartingPrice key={product.id} />)}
            </div>
          ) : (
            <div className="catalog-empty">
              <p className="eyebrow"><span aria-hidden="true">0</span>No arrangement found</p>
              <h2>Chưa tìm thấy bó hoa phù hợp.</h2>
              <p>Thử thay đổi dịp tặng hoặc khoảng ngân sách.</p>
              <button className="button button--solid" type="button" onClick={clearFilters}>Xóa bộ lọc</button>
            </div>
          )}
        </div>
      </section>
    </PageFrame>
  );
}
