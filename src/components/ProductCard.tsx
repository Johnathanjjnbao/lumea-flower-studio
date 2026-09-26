import { Link } from "react-router-dom";
import type { Product } from "../types/content";
import { formatMessage, useI18n } from "../i18n";
import { formatVnd } from "../utils/product";
import { AssetImage } from "./AssetImage";

interface ProductCardProps {
  product: Product;
  headingLevel?: 2 | 3;
  showAvailability?: boolean;
  showStartingPrice?: boolean;
}

export function ProductCard({ product, headingLevel = 3, showAvailability = false, showStartingPrice = false }: ProductCardProps) {
  const { t, path } = useI18n();
  const primaryImage = product.images[0];
  const copy = t.products[product.id];
  const statusLabel = product.tag ? t.product.tags[product.tag] : (showAvailability ? t.product.availability[product.availability] : undefined);
  const lightTag = product.tagTone === "light" || product.availability === "SEASONAL";
  const ProductHeading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="product-card">
      <Link className="product-image" to={path(`/flowers/${product.slug}`)} aria-label={formatMessage(t.product.view, { name: product.name })}>
        <AssetImage
          className={product.imageTone === "quiet" ? "image-tone--quiet" : undefined}
          asset={primaryImage.asset}
          alt={copy.imageAlts[0]}
          loading="lazy"
        />
        {statusLabel && <span className={`product-tag${lightTag ? " product-tag--light" : ""}`}>{statusLabel}</span>}
      </Link>
      <div className="product-meta">
        <div className="product-copy">
          <p className="product-category">{copy.category}</p>
          <ProductHeading><Link to={path(`/flowers/${product.slug}`)}>{product.name}</Link></ProductHeading>
          <p className="product-description">{copy.shortDescription}</p>
        </div>
        <div className="product-footer">
          <p className="product-price">{showStartingPrice ? `${t.common.from} ` : ""}{formatVnd(product.basePrice)}</p>
          <span className="product-arrow" aria-hidden="true">→</span>
        </div>
      </div>
    </article>
  );
}
