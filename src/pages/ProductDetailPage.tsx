import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { ProductGallery } from "../components/ProductGallery";
import { siteConfig } from "../config/siteConfig";
import { usePrototypeAction } from "../context/PrototypeActionContext";
import { getProductBySlug } from "../data/content";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useImagePipeline } from "../hooks/useImagePipeline";
import type { Product, ProductSize, ProductTone } from "../types/content";
import { availabilityLabels, formatVnd, getProductPrice, getSizePriceLabel } from "../utils/product";

function ProductNotFound() {
  useDocumentMetadata("Không tìm thấy thiết kế — Luméa", "Thiết kế hoa này không tồn tại hoặc đã được cập nhật.");

  return (
    <PageFrame>
      <section className="not-found section-shell section-space" aria-labelledby="not-found-title">
        <p className="eyebrow"><span aria-hidden="true">404</span>Luméa collection</p>
        <h1 id="not-found-title">Không tìm thấy<br />thiết kế này.</h1>
        <p>Thiết kế có thể đã được cập nhật hoặc không còn trong bộ sưu tập hiện tại.</p>
        <Link className="button button--solid" to="/flowers">Xem bộ sưu tập</Link>
      </section>
    </PageFrame>
  );
}

function ProductDetailContent({ product }: { product: Product }) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [sizeId, setSizeId] = useState<ProductSize["id"]>(product.sizes[0].id);
  const [toneId, setToneId] = useState<ProductTone["id"]>(product.tones[0].id);
  const { showPrototypeAction } = usePrototypeAction();
  const unavailable = product.availability === "UNAVAILABLE";
  const selectedPrice = getProductPrice(product, sizeId);

  useImagePipeline(pageRef, { observe: "images", prioritySelector: ".product-gallery__main", preloadMargin: "500px 0px" });
  useDocumentMetadata(
    `${product.name} — Luméa Flower Studio`,
    `${product.shortDescription}. Khám phá kích thước và tone màu cho ${product.name}.`,
  );

  return (
    <PageFrame pageRef={pageRef}>
      <article className="product-detail section-shell section-space">
        <Link className="product-detail__back" to="/flowers">← Bộ sưu tập</Link>
        <div className="product-detail__layout">
          <ProductGallery images={product.images} name={product.name} />
          <div className="product-detail__info">
            <div className="product-detail__heading">
              <p className="product-category">{product.category}</p>
              <h1>{product.name}</h1>
              <p className="product-detail__description">{product.description}</p>
            </div>

            <div className="product-detail__commerce-head">
              <div>
                <span>Giá theo lựa chọn</span>
                <strong aria-live="polite">{formatVnd(selectedPrice)}</strong>
              </div>
              <p className={`availability availability--${product.availability.toLowerCase()}`}>
                {availabilityLabels[product.availability]}
              </p>
            </div>

            <fieldset className="product-options">
              <legend>Kích thước</legend>
              <div className="size-options">
                {product.sizes.map((size) => (
                  <label className="size-option" data-selected={sizeId === size.id} key={size.id}>
                    <input type="radio" name="size" value={size.id} checked={sizeId === size.id} onChange={() => setSizeId(size.id)} />
                    <span className="size-option__head"><strong>{size.label}</strong><span>{getSizePriceLabel(product, size)}</span></span>
                    <small>{size.description}</small>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="product-options">
              <legend>Tone màu</legend>
              <div className="tone-options">
                {product.tones.map((tone) => (
                  <label className="tone-option" data-selected={toneId === tone.id} key={tone.id}>
                    <input type="radio" name="tone" value={tone.id} checked={toneId === tone.id} onChange={() => setToneId(tone.id)} />
                    <i style={{ backgroundColor: tone.swatch }} aria-hidden="true" />
                    <span>{tone.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="product-composition">
              <p>Thành phần gợi ý</p>
              <ul>{product.composition.map((flower) => <li key={flower}>{flower}</li>)}</ul>
              <small>Hoa theo mùa có thể thay đổi tự nhiên; studio sẽ xác nhận trước khi hoàn tất đơn.</small>
            </div>

            <div className="product-purchase">
              {product.sameDayEligible && <p className="same-day-eligibility"><span className="status-dot" aria-hidden="true" />{siteConfig.delivery.sameDayNote}</p>}
              <button
                className="button button--solid product-purchase__button"
                type="button"
                disabled={unavailable}
                onClick={() => showPrototypeAction("Chưa thêm vào giỏ", "Giỏ hàng sẽ được hoàn thiện ở bước tiếp theo.")}
              >
                {unavailable ? "Tạm hết" : "Thêm vào giỏ"}
              </button>
              <p className="product-delivery-note">{siteConfig.delivery.standardNote}</p>
            </div>
          </div>
        </div>
      </article>
    </PageFrame>
  );
}

export function ProductDetailPage() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);
  if (!product) return <ProductNotFound />;
  return <ProductDetailContent product={product} key={product.id} />;
}
