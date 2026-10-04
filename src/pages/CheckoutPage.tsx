import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { useCart } from "../features/cart/CartContext";
import type { CartLine } from "../features/cart/types";
import { clearCheckoutAttempt } from "../features/checkout/attempt";
import { checkoutSubtotal, createCheckoutPayload, inspectCheckoutLines } from "../features/checkout/domain";
import { CheckoutOrderError, createCheckoutOrder } from "../features/checkout/repository";
import { writeOrderReceipt } from "../features/checkout/receipt";
import type {
  CheckoutFieldName,
  CheckoutFormValues,
  CheckoutPaymentMethod,
  CheckoutValidationErrors,
} from "../features/checkout/types";
import {
  checkoutDeliveryDateBounds,
  validateCheckout,
  validateCheckoutField,
} from "../features/checkout/validation";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { formatMessage, useI18n } from "../i18n";
import { formatVnd } from "../utils/product";

const initialValues: CheckoutFormValues = {
  buyerName: "",
  buyerPhone: "",
  buyerEmail: "",
  buyerIsRecipient: false,
  recipientName: "",
  recipientPhone: "",
  isSurprise: false,
  deliveryAddress: "",
  deliveryDate: "",
  deliveryNotes: "",
  cardMessage: "",
  paymentMethod: "BANK_TRANSFER",
};

function CheckoutField({
  field,
  label,
  optional,
  error,
  children,
  help,
}: {
  field: CheckoutFieldName;
  label: string;
  optional?: string;
  error?: string;
  children: ReactNode;
  help?: string;
}) {
  return <div className="checkout-field" data-error={Boolean(error)}>
    <label htmlFor={field}>{label}{optional && <span>{optional}</span>}</label>
    {children}
    {help && !error && <p id={`${field}-help`} className="checkout-field__help">{help}</p>}
    {error && <p id={`${field}-error`} className="checkout-field__error" role="alert">{error}</p>}
  </div>;
}

function CheckoutSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="checkout-section">
    <header><h2>{title}</h2>{note && <p>{note}</p>}</header>
    {children}
  </section>;
}

function CheckoutLineSummary({ line }: { line: CartLine }) {
  const { t } = useI18n();
  const name = line.type === "READY_MADE_PRODUCT" ? line.display.productName : t.checkout.customBouquet;
  const detail = line.type === "READY_MADE_PRODUCT"
    ? [line.display.variantName, line.display.toneName].filter(Boolean).join(" · ")
    : `${line.totalStemCount} ${t.cart.stems.toLocaleLowerCase()} · ${line.wrapping.typeName} · ${line.wrapping.variantName}`;
  return <li className="checkout-summary-line">
    <div><span>{line.type === "READY_MADE_PRODUCT" ? t.checkout.readyMade : t.checkout.customBouquet}</span><strong>{name}</strong><small>{detail}</small></div>
    <div><span>{formatMessage(t.checkout.quantity, { count: line.quantity })}</span><strong>{formatVnd(line.unitPriceSnapshot * line.quantity)}</strong></div>
  </li>;
}

function CheckoutSummary({ lines }: { lines: readonly CartLine[] }) {
  const { t } = useI18n();
  const subtotal = checkoutSubtotal(lines);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
    <p className="checkout-summary__eyebrow">{t.checkout.summaryEyebrow}</p>
    <h2 id="checkout-summary-title">{t.checkout.summaryTitle}</h2>
    <p className="checkout-summary__count">{formatMessage(t.checkout.itemCount, { count })}</p>
    <ul>{lines.map((line) => <CheckoutLineSummary key={line.id} line={line} />)}</ul>
    <dl>
      <div><dt>{t.checkout.merchandiseSubtotal}</dt><dd>{formatVnd(subtotal)}</dd></div>
      <div><dt>{t.checkout.deliveryFee}</dt><dd>{t.checkout.deliveryPending}</dd></div>
    </dl>
    <p className="checkout-summary__pending">{t.checkout.totalPending}</p>
  </aside>;
}

function EmptyCheckout() {
  const { t, path } = useI18n();
  return <PageFrame><section className="checkout-empty section-shell section-space" aria-labelledby="checkout-empty-title">
    <p className="eyebrow"><span aria-hidden="true">01</span>{t.checkout.emptyEyebrow}</p>
    <h1 id="checkout-empty-title">{t.checkout.emptyTitle}</h1>
    <p>{t.checkout.emptyText}</p>
    <Link className="button button--solid" to={path("/flowers")}>{t.checkout.shopFlowers}</Link>
  </section></PageFrame>;
}

export function CheckoutPage() {
  const { locale, t, path } = useI18n();
  const { lines, clearCart, reconcileCart } = useCart();
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<CheckoutValidationErrors>({});
  const [checking, setChecking] = useState(lines.length > 0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [priceReviewRequired, setPriceReviewRequired] = useState(false);
  const [priceReviewed, setPriceReviewed] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const submitLock = useRef(false);
  const dateBounds = useMemo(() => checkoutDeliveryDateBounds(), []);
  const lineStatus = inspectCheckoutLines(lines);

  useDocumentMetadata(t.meta.checkoutTitle, t.meta.checkoutDescription);

  useEffect(() => {
    if (lines.length === 0) { setChecking(false); return; }
    let active = true;
    setChecking(true);
    void reconcileCart().then((checkedLines) => {
      if (!active) return;
      const status = inspectCheckoutLines(checkedLines);
      if (status.hasChangedPrices) setPriceReviewRequired(true);
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
    // Reconcile once on route entry; live submit performs the second mandatory check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconcileCart]);

  if (lines.length === 0) return <EmptyCheckout />;

  const errorText = (field: CheckoutFieldName) => {
    const code = errors[field];
    return code ? t.checkout.validation[code] : undefined;
  };

  const describedBy = (field: CheckoutFieldName, hasHelp = false) => {
    if (errors[field]) return `${field}-error`;
    return hasHelp ? `${field}-help` : undefined;
  };

  const update = <K extends keyof CheckoutFormValues>(field: K, value: CheckoutFormValues[K]) => {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "buyerIsRecipient" && value === true) {
        next.isSurprise = false;
        setErrors((currentErrors) => ({ ...currentErrors, recipientName: undefined, recipientPhone: undefined }));
      }
      if (field in errors) {
        const issue = validateCheckoutField(field as CheckoutFieldName, next);
        setErrors((currentErrors) => ({ ...currentErrors, [field]: issue }));
      }
      return next;
    });
    setServerError(null);
  };

  const onBlur = (field: CheckoutFieldName) => {
    const issue = validateCheckoutField(field, values);
    setErrors((current) => ({ ...current, [field]: issue }));
  };

  const inputProps = (field: CheckoutFieldName, hasHelp = false) => ({
    id: field,
    name: field,
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": describedBy(field, hasHelp),
    onBlur: () => onBlur(field),
  });

  const focusErrors = () => window.requestAnimationFrame(() => errorSummaryRef.current?.focus());

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLock.current) return;
    const nextErrors = validateCheckout(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) { focusErrors(); return; }
    if (priceReviewRequired && !priceReviewed) {
      setServerError(t.checkout.errors.priceAcknowledgement);
      window.requestAnimationFrame(() => document.getElementById("price-reviewed")?.focus());
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setServerError(null);
    try {
      const checkedLines = await reconcileCart();
      const status = inspectCheckoutLines(checkedLines);
      if (status.hasUnavailableItems || status.hasCheckErrors) {
        setServerError(t.checkout.errors.itemUnavailable);
        return;
      }
      if (status.hasChangedPrices) {
        setPriceReviewRequired(true);
        setPriceReviewed(false);
        setServerError(t.checkout.errors.priceChanged);
        return;
      }
      const reviewedSubtotal = checkoutSubtotal(checkedLines);
      const payload = createCheckoutPayload(values, checkedLines, locale);
      const receipt = await createCheckoutOrder({ payload, reviewedSubtotal });
      const stored = writeOrderReceipt(receipt);
      clearCheckoutAttempt();
      clearCart();
      navigate(path("/order-confirmation"), {
        replace: true,
        state: { receipt, storageWarning: !stored },
      });
    } catch (error) {
      if (error instanceof CheckoutOrderError) {
        if (error.code === "REVIEW_CHANGED") {
          const checkedLines = await reconcileCart();
          if (inspectCheckoutLines(checkedLines).hasChangedPrices) {
            setPriceReviewRequired(true);
            setPriceReviewed(false);
          }
          setServerError(t.checkout.errors.priceChanged);
        } else if (error.code === "ITEM_UNAVAILABLE") {
          await reconcileCart();
          setServerError(t.checkout.errors.itemUnavailable);
        } else if (error.code === "INVALID_REQUEST") setServerError(t.checkout.errors.invalidRequest);
        else if (error.code === "IDEMPOTENCY_CONFLICT") setServerError(t.checkout.errors.idempotency);
        else setServerError(t.checkout.errors.network);
      } else setServerError(t.checkout.errors.network);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const cartBlocked = lineStatus.hasUnavailableItems || lineStatus.hasCheckErrors;
  return <PageFrame><section className="checkout-page section-shell section-space" aria-labelledby="checkout-title">
    <Link className="checkout-back" to={path("/cart")}>{t.checkout.backToCart}</Link>
    <header className="checkout-page__header">
      <p className="eyebrow"><span aria-hidden="true">02</span>{t.checkout.eyebrow}</p>
      <h1 id="checkout-title">{t.checkout.title}</h1>
      <p>{t.checkout.intro}</p>
    </header>

    {checking && <p className="checkout-cart-status" role="status" aria-live="polite">{t.checkout.checkingCart}</p>}
    {!checking && cartBlocked && <section className="checkout-cart-blocked" aria-labelledby="checkout-cart-blocked-title">
      <h2 id="checkout-cart-blocked-title">{t.checkout.cartNeedsReviewTitle}</h2>
      <p>{t.checkout.cartNeedsReviewText}</p>
      <div><Link className="button button--solid" to={path("/cart")}>{t.checkout.reviewCart}</Link><button className="button button--outline" type="button" onClick={() => void reconcileCart()}>{t.checkout.retryCart}</button></div>
    </section>}

    {!cartBlocked && <div className="checkout-layout">
      <form className="checkout-form" noValidate onSubmit={(event) => void submit(event)}>
        {Object.keys(errors).length > 0 && <div className="checkout-error-summary" ref={errorSummaryRef} role="alert" tabIndex={-1} aria-labelledby="checkout-error-title">
          <h2 id="checkout-error-title">{t.checkout.errorSummaryTitle}</h2>
          <ul>{Object.entries(errors).map(([field, code]) => code && <li key={field}><a href={`#${field}`}>{t.checkout.validation[code]}</a></li>)}</ul>
        </div>}
        {serverError && <p className="checkout-server-error" role="alert">{serverError}</p>}

        <CheckoutSection title={t.checkout.sections.buyer} note={t.checkout.sectionNotes.buyer}>
          <div className="checkout-field-grid">
            <CheckoutField field="buyerName" label={t.checkout.fields.buyerName} error={errorText("buyerName")}>
              <input {...inputProps("buyerName")} autoComplete="name" value={values.buyerName} onChange={(event) => update("buyerName", event.target.value)} />
            </CheckoutField>
            <CheckoutField field="buyerPhone" label={t.checkout.fields.buyerPhone} error={errorText("buyerPhone")}>
              <input {...inputProps("buyerPhone")} autoComplete="tel" inputMode="tel" type="tel" value={values.buyerPhone} onChange={(event) => update("buyerPhone", event.target.value)} />
            </CheckoutField>
            <CheckoutField field="buyerEmail" label={t.checkout.fields.buyerEmail} optional={t.checkout.optional} error={errorText("buyerEmail")}>
              <input {...inputProps("buyerEmail")} autoComplete="email" inputMode="email" type="email" value={values.buyerEmail} onChange={(event) => update("buyerEmail", event.target.value)} />
            </CheckoutField>
          </div>
        </CheckoutSection>

        <CheckoutSection title={t.checkout.sections.recipient} note={t.checkout.sectionNotes.recipient}>
          <label className="checkout-choice checkout-choice--check" htmlFor="buyer-is-recipient">
            <input id="buyer-is-recipient" type="checkbox" checked={values.buyerIsRecipient} onChange={(event) => update("buyerIsRecipient", event.target.checked)} />
            <span><strong>{t.checkout.buyerIsRecipient}</strong><small>{t.checkout.buyerIsRecipientNote}</small></span>
          </label>
          {!values.buyerIsRecipient && <div className="checkout-field-grid checkout-field-grid--recipient">
            <CheckoutField field="recipientName" label={t.checkout.fields.recipientName} error={errorText("recipientName")}>
              <input {...inputProps("recipientName")} autoComplete="shipping name" value={values.recipientName} onChange={(event) => update("recipientName", event.target.value)} />
            </CheckoutField>
            <CheckoutField field="recipientPhone" label={t.checkout.fields.recipientPhone} error={errorText("recipientPhone")}>
              <input {...inputProps("recipientPhone")} autoComplete="shipping tel" inputMode="tel" type="tel" value={values.recipientPhone} onChange={(event) => update("recipientPhone", event.target.value)} />
            </CheckoutField>
          </div>}
          <label className="checkout-choice checkout-choice--check" htmlFor="is-surprise" data-disabled={values.buyerIsRecipient}>
            <input id="is-surprise" type="checkbox" checked={values.isSurprise} disabled={values.buyerIsRecipient} onChange={(event) => update("isSurprise", event.target.checked)} />
            <span><strong>{t.checkout.surprise}</strong><small>{t.checkout.surpriseNote}</small></span>
          </label>
        </CheckoutSection>

        <CheckoutSection title={t.checkout.sections.delivery} note={t.checkout.sectionNotes.delivery}>
          <div className="checkout-field-grid">
            <CheckoutField field="deliveryAddress" label={t.checkout.fields.deliveryAddress} error={errorText("deliveryAddress")} help={t.checkout.addressHelp}>
              <textarea {...inputProps("deliveryAddress", true)} autoComplete="shipping street-address" rows={3} value={values.deliveryAddress} onChange={(event) => update("deliveryAddress", event.target.value)} />
            </CheckoutField>
            <CheckoutField field="deliveryDate" label={t.checkout.fields.deliveryDate} error={errorText("deliveryDate")} help={t.checkout.dateHelp}>
              <input {...inputProps("deliveryDate", true)} min={dateBounds.min} max={dateBounds.max} type="date" value={values.deliveryDate} onChange={(event) => update("deliveryDate", event.target.value)} />
            </CheckoutField>
            <CheckoutField field="deliveryNotes" label={t.checkout.fields.deliveryNotes} optional={t.checkout.optional} error={errorText("deliveryNotes")}>
              <textarea {...inputProps("deliveryNotes")} rows={3} value={values.deliveryNotes} placeholder={t.checkout.deliveryNotesPlaceholder} onChange={(event) => update("deliveryNotes", event.target.value)} />
            </CheckoutField>
          </div>
        </CheckoutSection>

        <CheckoutSection title={t.checkout.sections.message} note={t.checkout.sectionNotes.message}>
          <CheckoutField field="cardMessage" label={t.checkout.fields.cardMessage} optional={t.checkout.optional} error={errorText("cardMessage")}>
            <textarea {...inputProps("cardMessage")} rows={4} value={values.cardMessage} placeholder={t.checkout.cardMessagePlaceholder} onChange={(event) => update("cardMessage", event.target.value)} />
          </CheckoutField>
        </CheckoutSection>

        <CheckoutSection title={t.checkout.sections.payment} note={t.checkout.sectionNotes.payment}>
          <fieldset className="checkout-payment">
            <legend className="sr-only">{t.checkout.sections.payment}</legend>
            {(["BANK_TRANSFER", "CASH"] as CheckoutPaymentMethod[]).map((method) => <label className="checkout-choice checkout-choice--radio" key={method} data-selected={values.paymentMethod === method}>
              <input type="radio" name="paymentMethod" value={method} checked={values.paymentMethod === method} onChange={(event: ChangeEvent<HTMLInputElement>) => update("paymentMethod", event.target.value as CheckoutPaymentMethod)} />
              <span><strong>{method === "BANK_TRANSFER" ? t.checkout.payment.bank : t.checkout.payment.cash}</strong><small>{method === "BANK_TRANSFER" ? t.checkout.payment.bankNote : t.checkout.payment.cashNote}</small></span>
            </label>)}
          </fieldset>
        </CheckoutSection>

        <CheckoutSection title={t.checkout.sections.review}>
          {priceReviewRequired && <div className="checkout-price-review" role="status">
            <h3>{t.checkout.priceChangedTitle}</h3><p>{t.checkout.priceChangedText}</p>
            <label htmlFor="price-reviewed"><input id="price-reviewed" type="checkbox" checked={priceReviewed} onChange={(event) => setPriceReviewed(event.target.checked)} /><span>{t.checkout.acknowledgePrice}</span></label>
          </div>}
          <button className="button button--solid checkout-submit" type="submit" disabled={submitting || checking}>{submitting ? t.checkout.submitting : t.checkout.submit}</button>
          <p className="checkout-submit-note">{t.checkout.submitNote}</p>
        </CheckoutSection>
      </form>
      <CheckoutSummary lines={lines} />
    </div>}
  </section></PageFrame>;
}
