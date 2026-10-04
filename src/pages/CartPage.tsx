import { useEffect, useId } from "react";
import { Link } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { useCart } from "../features/cart/CartContext";
import { MAX_CART_ITEM_QUANTITY, type CartLine } from "../features/cart/types";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { formatMessage, useI18n } from "../i18n";
import { formatVnd } from "../utils/product";

function CartLineStatus({ line }: { line: CartLine }) {
  const { t } = useI18n();
  if (line.validation.state === "valid") return null;
  if (line.validation.state === "checking" || line.validation.state === "unchecked") {
    return <p className="cart-line__status" data-tone="neutral" role="status">{t.cart.checkingItem}</p>;
  }
  if (line.validation.state === "changed") {
    return <p className="cart-line__status" data-tone="notice" role="status">
      {formatMessage(t.cart.priceChanged, {
        oldPrice: formatVnd(line.validation.previousUnitPrice ?? line.unitPriceSnapshot),
        newPrice: formatVnd(line.unitPriceSnapshot),
      })}
    </p>;
  }
  if (line.validation.state === "error") {
    return <p className="cart-line__status" data-tone="error" role="alert">{t.cart.itemCheckError}</p>;
  }
  return <p className="cart-line__status" data-tone="error" role="alert">{t.cart.unavailableItem}</p>;
}

function ReadyMadeDetails({ line }: { line: Extract<CartLine, { type: "READY_MADE_PRODUCT" }> }) {
  const { t, path } = useI18n();
  return <>
    <p className="cart-line__kind">{t.cart.readyMade}</p>
    <h2><Link to={path(`/flowers/${line.productSlug}`)}>{line.display.productName}</Link></h2>
    <dl className="cart-line__configuration">
      <div><dt>{t.cart.size}</dt><dd>{line.display.variantName}</dd></div>
      {line.display.toneName && <div><dt>{t.cart.tone}</dt><dd>{line.display.toneName}</dd></div>}
    </dl>
  </>;
}

function CustomBouquetDetails({ line }: { line: Extract<CartLine, { type: "CUSTOM_BOUQUET" }> }) {
  const { t } = useI18n();
  const visibleFlowers = line.flowers.slice(0, 3);
  const hiddenCount = line.flowers.length - visibleFlowers.length;
  return <>
    <p className="cart-line__kind">{t.cart.customBouquet}</p>
    <h2>{t.cart.customBouquetName}</h2>
    <p className="cart-line__flowers">
      {visibleFlowers.map((flower) => `${flower.name} × ${flower.quantity}`).join(" · ")}
      {hiddenCount > 0 ? ` · ${formatMessage(t.cart.moreFlowers, { count: hiddenCount })}` : ""}
    </p>
    <dl className="cart-line__configuration">
      <div><dt>{t.cart.wrapping}</dt><dd><i style={{ backgroundColor: line.wrapping.swatch }} aria-hidden="true" />{line.wrapping.typeName} · {line.wrapping.variantName}</dd></div>
      <div><dt>{t.cart.stems}</dt><dd>{line.totalStemCount}</dd></div>
    </dl>
  </>;
}

function CartLineItem({ line }: { line: CartLine }) {
  const { t } = useI18n();
  const { removeItem, setQuantity } = useCart();
  const quantityLabelId = useId();
  const image = line.type === "READY_MADE_PRODUCT"
    ? { url: line.display.imageUrl, alt: line.display.imageAlt }
    : { url: line.flowers[0]?.imageUrl ?? null, alt: line.flowers[0]?.imageAlt ?? t.cart.customBouquet };
  const isPurchasable = line.validation.state === "valid" || line.validation.state === "changed";
  const itemName = line.type === "READY_MADE_PRODUCT" ? line.display.productName : t.cart.customBouquetName;

  return <article className="cart-line" data-valid={isPurchasable}>
    <figure className="cart-line__media">
      {image.url ? <img src={image.url} alt={image.alt} loading="lazy" /> : <span aria-hidden="true">L</span>}
      {line.type === "CUSTOM_BOUQUET" && <i style={{ backgroundColor: line.wrapping.swatch }} aria-hidden="true" />}
    </figure>
    <div className="cart-line__body">
      <div className="cart-line__description">
        {line.type === "READY_MADE_PRODUCT" ? <ReadyMadeDetails line={line} /> : <CustomBouquetDetails line={line} />}
        <CartLineStatus line={line} />
      </div>
      <div className="cart-line__commerce">
        <div className="cart-line__unit"><span>{isPurchasable ? t.cart.unitPrice : t.cart.savedPrice}</span><strong>{formatVnd(line.unitPriceSnapshot)}</strong></div>
        <div className="cart-quantity">
          <span id={quantityLabelId}>{t.cart.quantity}</span>
          <div>
            <button type="button" disabled={line.quantity <= 1} onClick={() => setQuantity(line.id, line.quantity - 1)} aria-label={formatMessage(t.cart.decrease, { name: itemName })}>−</button>
            <input
              aria-labelledby={quantityLabelId}
              inputMode="numeric"
              min={1}
              max={MAX_CART_ITEM_QUANTITY}
              type="number"
              value={line.quantity}
              onChange={(event) => setQuantity(line.id, Number(event.target.value))}
            />
            <button type="button" disabled={line.quantity >= MAX_CART_ITEM_QUANTITY} onClick={() => setQuantity(line.id, line.quantity + 1)} aria-label={formatMessage(t.cart.increase, { name: itemName })}>＋</button>
          </div>
        </div>
        <div className="cart-line__subtotal"><span>{t.cart.lineSubtotal}</span><strong>{isPurchasable ? formatVnd(line.unitPriceSnapshot * line.quantity) : "—"}</strong></div>
        <button className="cart-line__remove" type="button" onClick={() => removeItem(line.id)} aria-label={formatMessage(t.cart.removeAria, { name: itemName })}>{t.cart.remove}</button>
      </div>
    </div>
  </article>;
}

function EmptyCart() {
  const { t, path } = useI18n();
  return <section className="cart-empty section-shell section-space" aria-labelledby="cart-empty-title">
    <p className="eyebrow"><span aria-hidden="true">01</span>{t.cart.eyebrow}</p>
    <div className="cart-empty__mark" aria-hidden="true">L</div>
    <h1 id="cart-empty-title">{t.cart.emptyTitle}</h1>
    <p>{t.cart.emptyText}</p>
    <div className="cart-empty__actions">
      <Link className="button button--solid" to={path("/flowers")}>{t.cart.shopFlowers}</Link>
      <Link className="button button--outline" to={path("/create-bouquet")}>{t.cart.createBouquet}</Link>
    </div>
  </section>;
}

export function CartPage() {
  const { t, path } = useI18n();
  const { lines, itemCount, subtotal, isReconciling, clearCart, reconcileCart } = useCart();
  const hasErrors = lines.some((line) => line.validation.state === "error");
  const invalidCount = lines.filter((line) => line.validation.state === "unavailable" || line.validation.state === "error").length;
  const canCheckout = !isReconciling && lines.every((line) => line.validation.state === "valid" || line.validation.state === "changed");

  useDocumentMetadata(t.meta.cartTitle, t.meta.cartDescription);
  useEffect(() => { void reconcileCart(); }, [reconcileCart]);

  if (lines.length === 0) return <PageFrame><EmptyCart /></PageFrame>;

  return <PageFrame><section className="cart-page section-shell section-space" aria-labelledby="cart-title">
    <header className="cart-page__header">
      <div><p className="eyebrow"><span aria-hidden="true">01</span>{t.cart.eyebrow}</p><h1 id="cart-title">{t.cart.title}</h1><p>{formatMessage(t.cart.itemSummary, { count: itemCount })}</p></div>
      <button className="cart-clear" type="button" onClick={clearCart}>{t.cart.clear}</button>
    </header>

    <div className="cart-layout">
      <div className="cart-lines" aria-busy={isReconciling}>
        {isReconciling && <p className="cart-reconcile-status" role="status">{t.cart.checkingCart}</p>}
        {hasErrors && <div className="cart-reconcile-error" role="alert"><p>{t.cart.checkError}</p><button type="button" onClick={() => void reconcileCart()}>{t.cart.retry}</button></div>}
        {lines.map((line) => <CartLineItem line={line} key={line.id} />)}
      </div>

      <aside className="cart-summary" aria-labelledby="cart-summary-title">
        <p className="cart-summary__eyebrow">{t.cart.summaryEyebrow}</p>
        <h2 id="cart-summary-title">{t.cart.summaryTitle}</h2>
        <dl>
          <div><dt>{t.cart.merchandiseSubtotal}</dt><dd>{formatVnd(subtotal)}</dd></div>
        </dl>
        {invalidCount > 0 && <p className="cart-summary__warning" role="status">{formatMessage(t.cart.invalidExcluded, { count: invalidCount })}</p>}
        <p className="cart-summary__delivery">{t.cart.deliveryNote}</p>
        {canCheckout
          ? <Link className="button button--solid cart-summary__checkout" to={path("/checkout")}>{t.cart.checkoutComing}</Link>
          : <button className="button button--solid cart-summary__checkout" type="button" disabled>{t.cart.checkoutComing}</button>}
        <p className="cart-summary__roadmap">{t.cart.checkoutNote}</p>
        <Link className="cart-summary__continue" to={path("/flowers")}>{t.cart.continueShopping}</Link>
      </aside>
    </div>
  </section></PageFrame>;
}
