import { Link } from "react-router-dom";
import { AssetImage } from "../components/AssetImage";
import { ProductCard } from "../components/ProductCard";
import { budgetRanges, occasions, products } from "../data/content";
import { budgetParamByRangeId } from "../utils/catalogDiscovery";
import { useI18n } from "../i18n";

export function Occasions() {
  const { t, path } = useI18n();
  return (
    <section className="occasions section-shell section-space" id="occasions" aria-labelledby="occasion-title">
      <div className="section-heading section-heading--split">
        <div>
          <p className="eyebrow"><span aria-hidden="true">02</span>{t.home.occasions.eyebrow}</p>
          <h2 id="occasion-title">{t.home.occasions.titleOne}<br />{t.home.occasions.titleTwo}</h2>
        </div>
        <p>{t.home.occasions.intro}</p>
      </div>
      <div className="occasion-grid">
        {occasions.map((occasion, index) => (
          <Link className={`occasion-tile occasion-tile--${occasion.id}`} to={path(`/flowers?occasion=${occasion.id}`)} key={occasion.id}>
            <AssetImage className={occasion.tone === "quiet" ? "image-tone--quiet" : undefined} asset={occasion.image} alt={t.occasions[occasion.id].alt} loading="lazy" />
            <span className="occasion-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="occasion-name">{t.occasions[occasion.id].name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function BestSellers() {
  const { t, path } = useI18n();
  const featuredProducts = products.filter((product) => product.featured);

  return (
    <section className="best-sellers section-space" id="best-sellers" aria-labelledby="best-sellers-title">
      <div className="section-shell">
        <div className="section-heading section-heading--row">
          <div>
            <p className="eyebrow"><span aria-hidden="true">03</span>{t.home.best.eyebrow}</p>
            <h2 id="best-sellers-title">{t.home.best.titleOne}<br />{t.home.best.titleTwo}</h2>
          </div>
          <Link className="text-link" to={path("/flowers")}>{t.home.best.viewAll}</Link>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => <ProductCard product={product} key={product.id} />)}
        </div>
      </div>
    </section>
  );
}

export function Budget() {
  const { t, path } = useI18n();
  return (
    <section className="budget section-space" id="budget" aria-labelledby="budget-title">
      <div className="section-shell budget-layout">
        <div className="budget-intro">
          <p className="eyebrow"><span aria-hidden="true">04</span>{t.home.budget.eyebrow}</p>
          <h2 id="budget-title">{t.home.budget.titleOne}<br />{t.home.budget.titleTwo}</h2>
          <p>{t.home.budget.intro}</p>
        </div>
        <nav className="budget-selector" aria-label={t.home.budget.aria}>
          {budgetRanges.map((range) => (
            <Link className={`budget-option budget-option--${range.id}`} to={path(`/flowers?budget=${budgetParamByRangeId[range.id]}`)} key={range.id}>
              <figure className="budget-option__image">
                <AssetImage asset={range.image} alt={t.budgets[range.id].alt} loading="lazy" />
              </figure>
              <span className="budget-option__scale">{t.budgets[range.id].scale}</span>
              <strong>{t.budgets[range.id].label}</strong>
              <span className="budget-option__note">{t.budgets[range.id].note}</span>
              <span className="budget-option__arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
