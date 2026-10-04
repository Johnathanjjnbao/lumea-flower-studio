import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { isOrderReceipt, readOrderReceipt } from "../features/checkout/receipt";
import type { OrderReceipt } from "../features/checkout/types";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useI18n } from "../i18n";
import { formatVnd } from "../utils/product";

interface ConfirmationLocationState {
  receipt?: unknown;
  storageWarning?: boolean;
}

export function OrderConfirmationPage() {
  const { t, path } = useI18n();
  const location = useLocation();
  const state = location.state as ConfirmationLocationState | null;
  const receipt = useMemo<OrderReceipt | null>(() => {
    if (isOrderReceipt(state?.receipt)) return state.receipt;
    return readOrderReceipt();
  }, [state?.receipt]);

  useDocumentMetadata(t.meta.confirmationTitle, t.meta.confirmationDescription);

  if (!receipt) return <PageFrame><section className="confirmation-missing section-shell section-space" aria-labelledby="confirmation-missing-title">
    <p className="eyebrow"><span aria-hidden="true">03</span>{t.confirmation.missingEyebrow}</p>
    <h1 id="confirmation-missing-title">{t.confirmation.missingTitle}</h1>
    <p>{t.confirmation.missingText}</p>
    <Link className="button button--solid" to={path("/")}>{t.confirmation.returnHome}</Link>
  </section></PageFrame>;

  const paymentName = receipt.paymentMethod === "BANK_TRANSFER" ? t.confirmation.bankTransfer : t.confirmation.cash;
  return <PageFrame><section className="confirmation-page section-shell section-space" aria-labelledby="confirmation-title">
    <div className="confirmation-page__mark" aria-hidden="true">L</div>
    <header>
      <p className="eyebrow"><span aria-hidden="true">03</span>{t.confirmation.eyebrow}</p>
      <h1 id="confirmation-title">{t.confirmation.title}</h1>
      <p>{t.confirmation.intro}</p>
    </header>
    {state?.storageWarning && <p className="confirmation-warning" role="status">{t.checkout.errors.receiptStorage}</p>}
    <section className="confirmation-receipt" aria-labelledby="confirmation-reference-title">
      <div className="confirmation-reference"><span id="confirmation-reference-title">{t.confirmation.reference}</span><strong>{receipt.orderNumber}</strong></div>
      <dl>
        <div><dt>{t.confirmation.orderStatus}</dt><dd>{t.confirmation.pending}</dd></div>
        <div><dt>{t.confirmation.paymentStatus}</dt><dd>{t.confirmation.unpaid}</dd></div>
        <div><dt>{t.confirmation.paymentMethod}</dt><dd>{paymentName}</dd></div>
        <div><dt>{t.confirmation.subtotal}</dt><dd>{formatVnd(receipt.subtotalAmount)}</dd></div>
        <div><dt>{t.confirmation.deliveryFee}</dt><dd>{receipt.deliveryFeeAmount === null ? t.confirmation.feePending : formatVnd(receipt.deliveryFeeAmount)}</dd></div>
        <div><dt>{t.confirmation.total}</dt><dd>{receipt.totalAmount === null ? t.confirmation.totalPending : formatVnd(receipt.totalAmount)}</dd></div>
      </dl>
      <p className="confirmation-payment-note">{receipt.paymentMethod === "BANK_TRANSFER" ? t.confirmation.bankNote : t.confirmation.cashNote}</p>
    </section>
    <section className="confirmation-next" aria-labelledby="confirmation-next-title"><h2 id="confirmation-next-title">{t.confirmation.nextTitle}</h2><p>{t.confirmation.nextText}</p></section>
    <Link className="button button--outline" to={path("/flowers")}>{t.confirmation.continueShopping}</Link>
  </section></PageFrame>;
}
