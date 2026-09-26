import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { ProductGallery } from "../components/ProductGallery";
import { usePrototypeAction } from "../context/PrototypeActionContext";
import { getProductBySlug } from "../data/content";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useImagePipeline } from "../hooks/useImagePipeline";
import { formatMessage, useI18n } from "../i18n";
import type { Product, ProductSize, ProductTone } from "../types/content";
import { formatVnd, getProductPrice, getSizePriceLabel } from "../utils/product";

function ProductNotFound() {
  const { t, path } = useI18n();
  useDocumentMetadata(t.product.detail.notFoundTitle, t.product.detail.notFoundDescription);
  return <PageFrame><section className="not-found section-shell section-space" aria-labelledby="not-found-title">
    <p className="eyebrow"><span aria-hidden="true">404</span>{t.product.detail.collectionEyebrow}</p>
    <h1 id="not-found-title">{t.product.detail.notFoundHeadingOne}<br />{t.product.detail.notFoundHeadingTwo}</h1>
    <p>{t.product.detail.notFoundText}</p>
    <Link className="button button--solid" to={path("/flowers")}>{t.product.detail.collection}</Link>
  </section></PageFrame>;
}

function ProductDetailContent({ product }: { product: Product }) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [sizeId, setSizeId] = useState<ProductSize["id"]>(product.sizes[0].id);
  const [toneId, setToneId] = useState<ProductTone["id"]>(product.tones[0].id);
  const { t, path } = useI18n();
  const { showPrototypeAction } = usePrototypeAction();
  const copy = t.products[product.id];
  const unavailable = product.availability === "UNAVAILABLE";
  const selectedPrice = getProductPrice(product, sizeId);
  const galleryImages = product.images.map((image, index) => ({ asset: image.asset, alt: copy.imageAlts[index] ?? copy.imageAlts[0] }));

  useImagePipeline(pageRef, { observe: "images", prioritySelector: ".product-gallery__main", preloadMargin: "500px 0px" });
  useDocumentMetadata(`${product.name} — Luméa Flower Studio`, formatMessage(t.product.detail.metaDescription, { description: copy.shortDescription, name: product.name }));

  return <PageFrame pageRef={pageRef}><article className="product-detail section-shell section-space">
    <Link className="product-detail__back" to={path("/flowers")}>{t.product.detail.back}</Link>
    <div className="product-detail__layout">
      <ProductGallery images={galleryImages} name={product.name} />
      <div className="product-detail__info">
        <div className="product-detail__heading"><p className="product-category">{copy.category}</p><h1>{product.name}</h1><p className="product-detail__description">{copy.description}</p></div>
        <div className="product-detail__commerce-head"><div><span>{t.product.detail.price}</span><strong aria-live="polite">{formatVnd(selectedPrice)}</strong></div><p className={`availability availability--${product.availability.toLowerCase()}`}>{t.product.availability[product.availability]}</p></div>
        <fieldset className="product-options"><legend>{t.product.detail.size}</legend><div className="size-options">
          {product.sizes.map((size) => <label className="size-option" data-selected={sizeId === size.id} key={size.id}><input type="radio" name="size" value={size.id} checked={sizeId === size.id} onChange={() => setSizeId(size.id)} /><span className="size-option__head"><strong>{t.product.sizes[size.id].label}</strong><span>{getSizePriceLabel(product, size)}</span></span><small>{t.product.sizes[size.id].description}</small></label>)}
        </div></fieldset>
        <fieldset className="product-options"><legend>{t.product.detail.tone}</legend><div className="tone-options">
          {product.tones.map((tone) => <label className="tone-option" data-selected={toneId === tone.id} key={tone.id}><input type="radio" name="tone" value={tone.id} checked={toneId === tone.id} onChange={() => setToneId(tone.id)} /><i style={{ backgroundColor: tone.swatch }} aria-hidden="true" /><span>{t.product.tones[tone.id]}</span></label>)}
        </div></fieldset>
        <div className="product-composition"><p>{t.product.detail.composition}</p><ul>{copy.composition.map((flower) => <li key={flower}>{flower}</li>)}</ul><small>{t.product.detail.seasonalNote}</small></div>
        <div className="product-purchase">
          {product.sameDayEligible && <p className="same-day-eligibility"><span className="status-dot" aria-hidden="true" />{t.product.detail.sameDay}</p>}
          <button className="button button--solid product-purchase__button" type="button" disabled={unavailable} onClick={() => showPrototypeAction(t.product.detail.addToast, t.product.detail.addToastText)}>{unavailable ? t.product.detail.unavailable : t.product.detail.add}</button>
          <p className="product-delivery-note">{t.product.detail.delivery}</p>
        </div>
      </div>
    </div>
  </article></PageFrame>;
}

export function ProductDetailPage() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);
  if (!product) return <ProductNotFound />;
  return <ProductDetailContent product={product} key={product.id} />;
}
