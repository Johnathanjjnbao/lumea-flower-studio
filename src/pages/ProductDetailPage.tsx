import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { ProductGallery } from "../components/ProductGallery";
import { useCart } from "../features/cart/CartContext";
import { clampCartQuantity, createReadyMadeCartItem } from "../features/cart/domain";
import { MAX_CART_ITEM_QUANTITY } from "../features/cart/types";
import type { CatalogProductRecord } from "../features/catalog/data/catalogRepository";
import { usePublishedProduct } from "../features/catalog/useCatalogData";
import { loadCheckoutOptions, isSameDayAvailable } from "../features/checkout/options";
import type { CheckoutOptions } from "../features/checkout/types";
import { publishedContentMap } from "../features/commercialContent/types";
import { useCommercialContent } from "../features/commercialContent/useCommercialContent";
import { useSiteProfile } from "../features/siteSettings/useSiteProfile";
import { isSafeEmail, isSafeInstagramUrl, normalizePhoneHref } from "../features/siteSettings/validation";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useImagePipeline } from "../hooks/useImagePipeline";
import { formatMessage, useI18n } from "../i18n";
import { formatVnd, getProductPrice, getVariantPriceLabel } from "../utils/product";
import { reviewMode } from "../review/mode";

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
  const { locale, t, path } = useI18n();
  const { addItem } = useCart();
  const commercialContent = useCommercialContent(locale);
  const policies = publishedContentMap(commercialContent.data);
  const siteProfile = useSiteProfile();
  const [checkoutOptions, setCheckoutOptions] = useState<CheckoutOptions | null>(null);
  const [checkoutOptionsStatus, setCheckoutOptionsStatus] = useState<"loading" | "success" | "error">("loading");
  const unavailable = product.availability !== "AVAILABLE" || !product.variants.some((variant) => variant.id === variantId);
  const unavailableLabel = product.availability === "SEASONAL" ? t.product.detail.seasonalUnavailable : t.product.detail.unavailable;
  const selectedPrice = getProductPrice(product, variantId);
  const deliveryPolicy = policies.get("DELIVERY");
  const returnsPolicy = policies.get("RETURNS_REFUNDS");
  const paymentPolicy = policies.get("PAYMENT");
  const inquiryPolicy = policies.get("CONTACT_INQUIRY");
  const careCopy = product.careInstructions || policies.get("FLOWER_CARE_DEFAULT")?.body || null;
  const defaultFreshnessCopy = policies.get("FRESHNESS_SUBSTITUTION_DEFAULT")?.body || null;
  const hasProductFreshnessCopy = Boolean(product.freshnessSeasonalityNote || product.substitutionNote);
  const sameDayAvailable = product.availability === "AVAILABLE" && product.sameDayEligible && isSameDayAvailable(checkoutOptions);
  const phoneHref = siteProfile ? normalizePhoneHref(siteProfile.phone) : null;
  const emailHref = siteProfile && isSafeEmail(siteProfile.email) ? `mailto:${siteProfile.email.trim()}` : null;
  const instagramHref = siteProfile?.instagramUrl.trim() && isSafeInstagramUrl(siteProfile.instagramUrl) ? siteProfile.instagramUrl.trim() : null;
  const hasContactChannel = Boolean(phoneHref || emailHref || instagramHref);

  useEffect(() => {
    let active = true;
    setCheckoutOptions(null);
    setCheckoutOptionsStatus("loading");
    void loadCheckoutOptions(locale).then(
      (options) => {
        if (!active) return;
        setCheckoutOptions(options);
        setCheckoutOptionsStatus("success");
      },
      () => {
        if (!active) return;
        setCheckoutOptionsStatus("error");
      },
    );
    return () => { active = false; };
  }, [locale]);

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
        <div className="product-detail__commerce-head"><div><span>{reviewMode ? (locale === "vi" ? "Giá minh họa" : "예시 가격") : t.product.detail.price}</span><strong aria-live="polite">{formatVnd(selectedPrice)}</strong></div><p className={`availability availability--${product.availability.toLowerCase()}`}>{t.product.availability[product.availability]}</p></div>
        <fieldset className="product-options"><legend>{t.product.detail.size}</legend><div className="size-options">
          {product.variants.map((variant) => <label className="size-option" data-selected={variantId === variant.id} key={variant.id}><input type="radio" name="size" value={variant.id} checked={variantId === variant.id} onChange={() => { setVariantId(variant.id); setAdded(false); }} /><span className="size-option__head"><strong>{variant.name}</strong><span>{getVariantPriceLabel(product, variant)}</span></span>{variant.description && <small>{variant.description}</small>}</label>)}
        </div></fieldset>
        {product.tones.length > 0 && <fieldset className="product-options"><legend>{t.product.detail.tone}</legend><div className="tone-options">
          {product.tones.map((tone) => <label className="tone-option" data-selected={toneId === tone.stableCode} key={tone.stableCode}><input type="radio" name="tone" value={tone.stableCode} checked={toneId === tone.stableCode} onChange={() => { setToneId(tone.stableCode); setAdded(false); }} />{tone.swatchValue && <i style={{ backgroundColor: tone.swatchValue }} aria-hidden="true" />}<span>{tone.name}</span></label>)}
        </div></fieldset>}
        {product.composition.length > 0 && <div className="product-composition"><p>{t.product.detail.composition}</p><ul>{product.composition.map((flower) => <li key={flower}>{flower}</li>)}</ul></div>}
        <div className="product-purchase">
          {sameDayAvailable && <p className="same-day-eligibility"><span className="status-dot" aria-hidden="true" />{t.product.detail.sameDayAvailable}</p>}
          <div className="product-purchase__row">
            <label className="product-quantity"><span>{t.product.detail.quantity}</span><input type="number" inputMode="numeric" min={1} max={MAX_CART_ITEM_QUANTITY} value={quantity} onChange={(event) => { setQuantity(clampCartQuantity(Number(event.target.value))); setAdded(false); }} /></label>
            <button className="button button--solid product-purchase__button" type="button" disabled={unavailable || added} onClick={addToCart}>{unavailable ? unavailableLabel : added ? t.product.detail.added : t.product.detail.add}</button>
          </div>
          {added && <p className="product-add-status" role="status">{t.product.detail.addedText} <Link to={path("/cart")}>{t.product.detail.viewCart}</Link></p>}
        </div>
        <section className="product-commercial-overview" aria-labelledby="commercial-overview-heading" aria-busy={commercialContent.status === "loading"}>
          <div className="product-commercial-overview__heading"><h2 id="commercial-overview-heading">{t.product.detail.commercialInfo}</h2><Link to={path("/policies")}>{t.product.detail.policiesLink}</Link></div>
          <div className="product-commercial-overview__grid">
            <div><strong>{t.product.detail.deliveryOverview}</strong><p>{commercialContent.status === "loading" ? t.policies.loading : deliveryPolicy?.summary || t.product.detail.contentUnavailable}</p></div>
            <div><strong>{t.product.detail.returnsOverview}</strong><p>{commercialContent.status === "loading" ? t.policies.loading : returnsPolicy?.summary || t.product.detail.contentUnavailable}</p></div>
          </div>
        </section>
      </div>
    </div>
    <section className="product-commercial-details" aria-label={t.product.detail.commercialInfo}>
      <details>
        <summary>{t.product.detail.deliveryHeading}</summary>
        <div className="product-commercial-details__body">
          {product.fulfillmentNote && <p>{product.fulfillmentNote}</p>}
          {deliveryPolicy?.body ? <div className="commercial-copy">{deliveryPolicy.body}</div> : <p>{t.product.detail.contentUnavailable}</p>}
          {checkoutOptionsStatus === "success" && checkoutOptions ? <div className="commercial-status-list" aria-label={t.product.detail.deliveryHeading}>
            {checkoutOptions.deliveryEnabled && <span>{t.product.detail.deliveryAvailable}</span>}
            {checkoutOptions.pickupEnabled && <span>{t.product.detail.pickupAvailable}</span>}
            {sameDayAvailable && <span>{t.product.detail.sameDayAvailable}</span>}
          </div> : <p className="commercial-live-status">{checkoutOptionsStatus === "loading" ? t.policies.loading : t.product.detail.liveOptionsUnavailable}</p>}
          {checkoutOptions?.deliveryHelp && <p>{checkoutOptions.deliveryHelp}</p>}
          {checkoutOptions?.pickup && <p>{checkoutOptions.pickup.name} · {checkoutOptions.pickup.address} · {checkoutOptions.pickup.hours}</p>}
        </div>
      </details>
      <details>
        <summary>{t.product.detail.returnsHeading}</summary>
        <div className="product-commercial-details__body">{returnsPolicy?.body ? <div className="commercial-copy">{returnsPolicy.body}</div> : <p>{t.product.detail.contentUnavailable}</p>}</div>
      </details>
      <details>
        <summary>{t.product.detail.careHeading}</summary>
        <div className="product-commercial-details__body">{careCopy ? <div className="commercial-copy">{careCopy}</div> : <p>{t.product.detail.contentUnavailable}</p>}</div>
      </details>
      <details>
        <summary>{t.product.detail.freshnessHeading}</summary>
        <div className="product-commercial-details__body">
          {hasProductFreshnessCopy ? <>
            {product.freshnessSeasonalityNote && <div className="commercial-copy">{product.freshnessSeasonalityNote}</div>}
            {product.substitutionNote && <div className="commercial-copy">{product.substitutionNote}</div>}
          </> : defaultFreshnessCopy ? <div className="commercial-copy">{defaultFreshnessCopy}</div> : <p>{t.product.detail.contentUnavailable}</p>}
        </div>
      </details>
      <details>
        <summary>{t.product.detail.paymentHeading}</summary>
        <div className="product-commercial-details__body">
          {paymentPolicy?.body ? <div className="commercial-copy">{paymentPolicy.body}</div> : <p>{t.product.detail.contentUnavailable}</p>}
          {checkoutOptionsStatus === "success" && checkoutOptions ? <div className="commercial-status-list" aria-label={t.product.detail.paymentHeading}>
            {checkoutOptions.paymentMethods.bankTransfer && <span>{t.product.detail.bankTransfer}</span>}
            {(checkoutOptions.paymentMethods.cash || checkoutOptions.paymentMethods.cashDelivery || checkoutOptions.paymentMethods.cashPickup) && <span>{t.product.detail.cash}</span>}
          </div> : <p className="commercial-live-status">{checkoutOptionsStatus === "loading" ? t.policies.loading : t.product.detail.liveOptionsUnavailable}</p>}
        </div>
      </details>
    </section>
    <aside className="product-inquiry" aria-labelledby="product-inquiry-heading">
      <div><p className="eyebrow"><span aria-hidden="true">?</span>{t.product.detail.commercialInfo}</p><h2 id="product-inquiry-heading">{t.product.detail.inquiryHeading}</h2><p>{inquiryPolicy?.summary || t.product.detail.inquiryText}</p></div>
      <div className="product-inquiry__links">
        {phoneHref && <a className="button button--outline" href={phoneHref}>{t.product.detail.phone}</a>}
        {emailHref && <a className="button button--outline" href={emailHref}>{t.product.detail.email}</a>}
        {instagramHref && <a className="button button--outline" href={instagramHref} target="_blank" rel="noreferrer">{t.product.detail.instagram}</a>}
        {!hasContactChannel && <p>{t.product.detail.contactUnavailable}</p>}
      </div>
    </aside>
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
