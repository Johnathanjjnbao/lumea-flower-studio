import { Link } from "react-router-dom";
import { AssetImage } from "../components/AssetImage";
import { ProductCard } from "../components/ProductCard";
import { budgetRanges, occasions, products } from "../data/content";
import { budgetParamByRangeId } from "../utils/catalogDiscovery";

export function Occasions() {
  return (
    <section className="occasions section-shell section-space" id="occasions" aria-labelledby="occasion-title">
      <div className="section-heading section-heading--split">
        <div>
          <p className="eyebrow"><span aria-hidden="true">02</span>The occasion edit</p>
          <h2 id="occasion-title">Bạn đang gửi hoa<br />cho dịp nào?</h2>
        </div>
        <p>Mỗi dịp có một cảm xúc riêng. Bạn chỉ cần bắt đầu từ điều muốn nói, chúng tôi sẽ giúp chọn những cành hoa phù hợp.</p>
      </div>
      <div className="occasion-grid">
        {occasions.map((occasion, index) => (
          <Link className={`occasion-tile occasion-tile--${occasion.id}`} to={`/flowers?occasion=${occasion.id}`} key={occasion.id}>
            <AssetImage className={occasion.tone === "quiet" ? "image-tone--quiet" : undefined} asset={occasion.image} alt={occasion.alt} loading="lazy" />
            <span className="occasion-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="occasion-name">{occasion.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function BestSellers() {
  const featuredProducts = products.filter((product) => product.featured);

  return (
    <section className="best-sellers section-space" id="best-sellers" aria-labelledby="best-sellers-title">
      <div className="section-shell">
        <div className="section-heading section-heading--row">
          <div>
            <p className="eyebrow"><span aria-hidden="true">03</span>The Luméa edit</p>
            <h2 id="best-sellers-title">Những bó hoa<br />được yêu thích</h2>
          </div>
          <Link className="text-link" to="/flowers">Xem tất cả thiết kế</Link>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => <ProductCard product={product} key={product.id} />)}
        </div>
      </div>
    </section>
  );
}

export function Budget() {
  return (
    <section className="budget section-space" id="budget" aria-labelledby="budget-title">
      <div className="section-shell budget-layout">
        <div className="budget-intro">
          <p className="eyebrow"><span aria-hidden="true">04</span>A thoughtful gesture, at every scale</p>
          <h2 id="budget-title">Tìm hoa theo<br />ngân sách</h2>
          <p>Chọn khoảng giá phù hợp, chúng tôi sẽ giúp bạn tìm một thiết kế đủ đầy đặn và tinh tế.</p>
        </div>
        <nav className="budget-selector" aria-label="Chọn hoa theo ngân sách">
          {budgetRanges.map((range) => (
            <Link className={`budget-option budget-option--${range.id}`} to={`/flowers?budget=${budgetParamByRangeId[range.id]}`} key={range.id}>
              <figure className="budget-option__image">
                <AssetImage asset={range.image} alt={range.alt} loading="lazy" />
              </figure>
              <span className="budget-option__scale">{range.scale}</span>
              <strong>{range.label}</strong>
              <span className="budget-option__note">{range.note}</span>
              <span className="budget-option__arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
