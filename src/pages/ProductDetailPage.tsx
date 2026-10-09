import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { ProductGallery } from "../components/ProductGallery";
import { useCart } from "../features/cart/CartContext";
import { clampCartQuantity, createReadyMadeCartItem } from "../features/cart/domain";
import { MAX_CART_ITEM_QUANTITY } from "../features/cart/types";
import type { CatalogProductRecord } from "../features/catalog/data/catalogRepository";
import { usePublishedProduct } from "../features/catalog/useCatalogData";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useImagePipeline } from "../hooks/useImagePipeline";
import { formatMessage, useI18n } from "../i18n";
import { formatVnd, getProductPrice, getVariantPriceLabel } from "../utils/product";

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

function ProductDetailLoading() {
  const { t } = useI18n();
  return <PageFrame><section className="product-detail product-detail--loading section-shell section-space" aria-busy="true" aria-label={t.product.detail.loading}>
    <div className="product-detail__layout">
      <div className="product-gallery__main catalog-skeleton" />
      <div className="product-detail__info">
        <div className="catalog-skeleton catalog-skeleton--line" />
        <div className="catalog-skeleton catalog-skeleton--heading" />
        <div className="catalog-skeleton catalog-skeleton--paragraph" />
      </div>
    </div>
  </section></PageFrame>;
}

function ProductDetailError({ retry }: { retry: () => void }) {
  const { t } = useI18n();
  useDocumentMetadata(t.product.detail.errorTitle, t.product.detail.errorDescription);
  return <PageFrame><section className="not-found section-shell section-space" role="alert" aria-labelledby="product-error-title">
    <p className="eyebrow"><span aria-hidden="true">!</span>{t.catalog.errorEyebrow}</p>
    <h1 id="product-error-title">{t.product.detail.errorHeadingOne}<br />{t.product.detail.errorHeadingTwo}</h1>
    <p>{t.product.detail.errorText}</p>
    <button className="button button--solid" type="button" onClick={retry}>{t.catalog.retry}</button>
  </section></PageFrame>;
}

function ProductDetailContent({ product }: { product: CatalogProductRecord }) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [toneId, setToneId] = useState(product.tones[0]?.stableCode ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { t, path } = useI18n();
  const { addItem } = useCart();
  const unavailable = product.availability !== "AVAILABLE" || !product.variants.some((variant) => variant.id === variantId);
  const unavailableLabel = product.availability === "SEASONAL" ? t.product.detail.seasonalUnavailable : t.product.detail.unavailable;
  const selectedPrice = getProductPrice(product, variantId);

  useImagePipeline(pageRef, { observe: "images", prioritySelector: ".product-gallery__main", preloadMargin: "500px 0px" });
  useDocumentMetadata(
    product.seoTitle ?? `${product.name} — Luméa Flower Studio`,
    product.seoDescription ?? formatMessage(t.product.detail.metaDescription, { description: product.shortDescription ?? product.name, name: product.name }),
  );

  const addToCart = () => {
    if (added) return;
    const item = createReadyMadeCartItem(product, variantId, toneId || null, quantity);
    if (!item) return;
    addItem(item);
    setAdded(true);
  };

  return <PageFrame pageRef={pageRef}><article className="product-detail section-shell section-space">
    <Link className="product-detail__back" to={path("/flowers")}>{t.product.detail.back}</Link>
    <div className="product-detail__layout">
      <ProductGallery images={product.images} name={product.name} />
      <div className="product-detail__info">
        <div className="product-detail__heading"><p className="product-category">{product.category.name}</p><h1>{product.name}</h1>{product.description && <p className="product-detail__description">{product.description}</p>}</div>
        <div className="product-detail__commerce-head"><div><span>{t.product.detail.price}</span><strong aria-live="polite">{formatVnd(selectedPrice)}</strong></div><p className={`availability availability--${product.availability.toLowerCase()}`}>{t.product.availability[product.availability]}</p></div>
        <fieldset className="product-options"><legend>{t.product.detail.size}</legend><div className="size-options">
          {product.variants.map((variant) => <label className="size-option" data-selected={variantId === variant.id} key={variant.id}><input type="radio" name="size" value={variant.id} checked={variantId === variant.id} onChange={() => { setVariantId(variant.id); setAdded(false); }} /><span className="size-option__head"><strong>{variant.name}</strong><span>{getVariantPriceLabel(product, variant)}</span></span>{variant.description && <small>{variant.description}</small>}</label>)}
        </div></fieldset>
        {product.tones.length > 0 && <fieldset className="product-options"><legend>{t.product.detail.tone}</legend><div className="tone-options">
          {product.tones.map((tone) => <label className="tone-option" data-selected={toneId === tone.stableCode} key={tone.stableCode}><input type="radio" name="tone" value={tone.stableCode} checked={toneId === tone.stableCode} onChange={() => { setToneId(tone.stableCode); setAdded(false); }} />{tone.swatchValue && <i style={{ backgroundColor: tone.swatchValue }} aria-hidden="true" />}<span>{tone.name}</span></label>)}
        </div></fieldset>}
        {product.composition.length > 0 && <div className="product-composition"><p>{t.product.detail.composition}</p><ul>{product.composition.map((flower) => <li key={flower}>{flower}</li>)}</ul><small>{t.product.detail.seasonalNote}</small></div>}
        <div className="product-purchase">
          {product.availability === "AVAILABLE" && product.sameDayEligible && <p className="same-day-eligibility"><span className="status-dot" aria-hidden="true" />{t.product.detail.sameDay}</p>}
          <div className="product-purchase__row">
            <label className="product-quantity"><span>{t.product.detail.quantity}</span><input type="number" inputMode="numeric" min={1} max={MAX_CART_ITEM_QUANTITY} value={quantity} onChange={(event) => { setQuantity(clampCartQuantity(Number(event.target.value))); setAdded(false); }} /></label>
            <button className="button button--solid product-purchase__button" type="button" disabled={unavailable || added} onClick={addToCart}>{unavailable ? unavailableLabel : added ? t.product.detail.added : t.product.detail.add}</button>
          </div>
          {added && <p className="product-add-status" role="status">{t.product.detail.addedText} <Link to={path("/cart")}>{t.product.detail.viewCart}</Link></p>}
          <p className="product-delivery-note">{t.product.detail.delivery}</p>
        </div>
      </div>
    </div>
  </article></PageFrame>;
}

export function ProductDetailPage() {
  const { slug } = useParams();
  const { locale } = useI18n();
  const productState = usePublishedProduct(slug ?? "", locale);
  if (productState.status === "loading") return <ProductDetailLoading />;
  if (productState.status === "error") return <ProductDetailError retry={productState.retry} />;
  if (!productState.data) return <ProductNotFound />;
  return <ProductDetailContent product={productState.data} key={productState.data.id} />;
}
