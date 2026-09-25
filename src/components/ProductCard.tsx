import { Link } from "react-router-dom";
import type { Product } from "../types/content";
import { availabilityLabels, formatVnd } from "../utils/product";
import { AssetImage } from "./AssetImage";

interface ProductCardProps {
  product: Product;
  showAvailability?: boolean;
  showStartingPrice?: boolean;
}

export function ProductCard({ product, showAvailability = false, showStartingPrice = false }: ProductCardProps) {
  const primaryImage = product.images[0];
  const statusLabel = product.tag ?? (showAvailability ? availabilityLabels[product.availability] : undefined);
  const lightTag = product.tagTone === "light" || product.availability === "SEASONAL";

  return (
    <article className="product-card">
      <Link className="product-image" to={`/flowers/${product.slug}`} aria-label={`Xem ${product.name}`}>
        <AssetImage
          className={product.imageTone === "quiet" ? "image-tone--quiet" : undefined}
          asset={primaryImage.asset}
          alt={primaryImage.alt}
          loading="lazy"
        />
        {statusLabel && <span className={`product-tag${lightTag ? " product-tag--light" : ""}`}>{statusLabel}</span>}
      </Link>
      <div className="product-meta">
        <div className="product-copy">
          <p className="product-category">{product.category}</p>
          <h3><Link to={`/flowers/${product.slug}`}>{product.name}</Link></h3>
          <p className="product-description">{product.shortDescription}</p>
        </div>
        <div className="product-footer">
          <p className="product-price">{showStartingPrice ? "Từ " : ""}{formatVnd(product.basePrice)}</p>
          <span className="product-arrow" aria-hidden="true">→</span>
        </div>
      </div>
    </article>
  );
}
