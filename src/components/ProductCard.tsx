import { Link } from "react-router-dom";
import type { CatalogProductRecord } from "../features/catalog/data/catalogRepository";
import { formatMessage, useI18n } from "../i18n";
import { formatVnd } from "../utils/product";
import { ManagedImage } from "./ManagedImage";

interface ProductCardProps {
  product: CatalogProductRecord;
  headingLevel?: 2 | 3;
  showAvailability?: boolean;
  showStartingPrice?: boolean;
}

export function ProductCard({ product, headingLevel = 3, showAvailability = false, showStartingPrice = false }: ProductCardProps) {
  const { t, path } = useI18n();
  const primaryImage = product.images.find((image) => image.role === "PRIMARY") ?? product.images[0];
  const statusLabel = product.bestseller
    ? t.product.tags.bestseller
    : product.availability === "SEASONAL"
      ? t.product.tags.seasonal
      : showAvailability
        ? t.product.availability[product.availability]
        : undefined;
  const lightTag = product.availability === "SEASONAL";
  const ProductHeading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article className="product-card">
      <Link className="product-image" to={path(`/flowers/${product.slug}`)} aria-label={formatMessage(t.product.view, { name: product.name })}>
        {primaryImage ? <ManagedImage
          src={primaryImage.url}
          alt={primaryImage.altText}
          loading="lazy"
          width={800}
          height={1000}
        /> : <span className="managed-image-placeholder" aria-hidden="true">L</span>}
        {statusLabel && <span className={`product-tag${lightTag ? " product-tag--light" : ""}`}>{statusLabel}</span>}
      </Link>
      <div className="product-meta">
        <div className="product-copy">
          <p className="product-category">{t.product.typeLabels[product.productType]}</p>
          <ProductHeading><Link to={path(`/flowers/${product.slug}`)}>{product.name}</Link></ProductHeading>
          {product.shortDescription && <p className="product-description">{product.shortDescription}</p>}
        </div>
        <div className="product-footer">
          <p className="product-price">{showStartingPrice || product.variants.length > 1 ? `${t.common.from} ` : ""}{formatVnd(product.startingPriceAmount)}</p>
          <span className="product-arrow" aria-hidden="true">→</span>
        </div>
      </div>
    </article>
  );
}
