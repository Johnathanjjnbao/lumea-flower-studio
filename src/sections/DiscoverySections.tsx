import { Link } from "react-router-dom";
import { ManagedImage } from "../components/ManagedImage";
import { ProductCard } from "../components/ProductCard";
import type { CatalogProductRecord } from "../features/catalog/data/catalogRepository";
import type { DiscoveryBudgetRange, DiscoveryOccasion } from "../features/discovery/types";
import { mediaBySlot, type HomepageSection } from "../features/homepage/types";
import { useI18n } from "../i18n";

export function Occasions({ section, occasions }: { section: HomepageSection; occasions: DiscoveryOccasion[] }) {
  const { path } = useI18n();
  const copy = section.copy;
  return (
    <section className="occasions section-shell section-space" id="occasions" aria-labelledby="occasion-title">
      <div className="section-heading section-heading--split">
        <div>
          <p className="eyebrow"><span aria-hidden="true">02</span>{copy.eyebrow}</p>
          <h2 id="occasion-title">{copy.titleOne}<br />{copy.titleTwo}</h2>
        </div>
        <p>{copy.body}</p>
      </div>
      <div className="occasion-grid">
        {occasions.map((occasion, index) => {
          const media = mediaBySlot(section, `occasion-${occasion.stableCode}`);
          return (
          <Link className={`occasion-tile occasion-tile--${occasion.stableCode}`} to={path(`/flowers?occasion=${occasion.stableCode}`)} key={occasion.id}>
            {media && <ManagedImage className={occasion.stableCode === "sympathy" ? "image-tone--quiet" : undefined} src={media.url} alt={media.altText} loading="lazy" />}
            <span className="occasion-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="occasion-name">{occasion.name}</span>
          </Link>
        );})}
      </div>
    </section>
  );
}

export function BestSellers({ section, products }: { section: HomepageSection; products: CatalogProductRecord[] }) {
  const { path } = useI18n();
  const copy = section.copy;

  return (
    <section className="best-sellers section-space" id="best-sellers" aria-labelledby="best-sellers-title">
      <div className="section-shell">
        <div className="section-heading section-heading--row">
          <div>
            <p className="eyebrow"><span aria-hidden="true">03</span>{copy.eyebrow}</p>
            <h2 id="best-sellers-title">{copy.titleOne}<br />{copy.titleTwo}</h2>
          </div>
          <Link className="text-link" to={path(section.primaryCtaTarget || "/flowers")}>{copy.primaryCtaLabel}</Link>
        </div>
        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => <ProductCard product={product} key={product.id} />)}
          </div>
        ) : (
          <div className="home-catalog-state"><p>{copy.note}</p></div>
        )}
      </div>
    </section>
  );
}

export function Budget({ section, budgetRanges }: { section: HomepageSection; budgetRanges: DiscoveryBudgetRange[] }) {
  const { t, path } = useI18n();
  const copy = section.copy;
  return (
    <section className="budget section-space" id="budget" aria-labelledby="budget-title">
      <div className="section-shell budget-layout">
        <div className="budget-intro">
          <p className="eyebrow"><span aria-hidden="true">04</span>{copy.eyebrow}</p>
          <h2 id="budget-title">{copy.titleOne}<br />{copy.titleTwo}</h2>
          <p>{copy.body}</p>
        </div>
        <nav className="budget-selector" aria-label={t.home.budget.aria}>
          {budgetRanges.map((range) => {
            const media = mediaBySlot(section, `budget-${range.stableCode}`);
            return (
            <Link className={`budget-option budget-option--${range.stableCode}`} to={path(`/flowers?budget=${range.stableCode}`)} key={range.id}>
              <figure className="budget-option__image">
                {media && <ManagedImage src={media.url} alt={media.altText} loading="lazy" />}
              </figure>
              <span className="budget-option__scale">{range.scaleLabel}</span>
              <strong>{range.label}</strong>
              <span className="budget-option__note">{range.description}</span>
              <span className="budget-option__arrow" aria-hidden="true">↗</span>
            </Link>
          );})}
        </nav>
      </div>
    </section>
  );
}
