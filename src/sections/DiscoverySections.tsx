import { AssetImage } from "../components/AssetImage";
import { budgetRanges, occasions, products } from "../data/content";

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
          <a className={`occasion-tile occasion-tile--${occasion.id}`} href="#best-sellers" key={occasion.id}>
            <AssetImage className={occasion.tone === "quiet" ? "image-tone--quiet" : undefined} asset={occasion.image} alt={occasion.alt} loading="lazy" />
            <span className="occasion-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="occasion-name">{occasion.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function BestSellers() {
  return (
    <section className="best-sellers section-space" id="best-sellers" aria-labelledby="best-sellers-title">
      <div className="section-shell">
        <div className="section-heading section-heading--row">
          <div>
            <p className="eyebrow"><span aria-hidden="true">03</span>The Luméa edit</p>
            <h2 id="best-sellers-title">Những bó hoa<br />được yêu thích</h2>
          </div>
          <a className="text-link" href="#best-sellers">Xem tất cả thiết kế</a>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <a className="product-image" href="#best-sellers" aria-label={`Xem ${product.name}`}>
                <AssetImage className={product.imageTone === "quiet" ? "image-tone--quiet" : undefined} asset={product.image} alt={product.alt} loading="lazy" />
                {product.tag && <span className={`product-tag${product.tagTone === "light" ? " product-tag--light" : ""}`}>{product.tag}</span>}
              </a>
              <div className="product-meta">
                <div className="product-copy">
                  <p className="product-category">{product.category}</p>
                  <h3><a href="#best-sellers">{product.name}</a></h3>
                  <p className="product-description">{product.description}</p>
                </div>
                <div className="product-footer">
                  <p className="product-price">{product.price}</p>
                  <span className="product-arrow" aria-hidden="true">→</span>
                </div>
              </div>
            </article>
          ))}
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
            <a className={`budget-option budget-option--${range.id}`} href="#best-sellers" key={range.id}>
              <figure className="budget-option__image">
                <AssetImage asset={range.image} alt={range.alt} loading="lazy" />
              </figure>
              <span className="budget-option__scale">{range.scale}</span>
              <strong>{range.label}</strong>
              <span className="budget-option__note">{range.note}</span>
              <span className="budget-option__arrow" aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
