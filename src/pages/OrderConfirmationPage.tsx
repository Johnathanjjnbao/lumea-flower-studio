import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { isOrderReceipt, readOrderReceipt, vietQrImageUrl } from "../features/checkout/receipt";
import type { OrderReceipt } from "../features/checkout/types";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { formatMessage, useI18n } from "../i18n";
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
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useDocumentMetadata(t.meta.confirmationTitle, t.meta.confirmationDescription);

  if (!receipt) return <PageFrame><section className="confirmation-missing section-shell section-space" aria-labelledby="confirmation-missing-title">
    <p className="eyebrow"><span aria-hidden="true">03</span>{t.confirmation.missingEyebrow}</p>
    <h1 id="confirmation-missing-title">{t.confirmation.missingTitle}</h1>
    <p>{t.confirmation.missingText}</p>
    <Link className="button button--solid" to={path("/")}>{t.confirmation.returnHome}</Link>
  </section></PageFrame>;

  const paymentName = receipt.paymentMethod === "BANK_TRANSFER" ? t.confirmation.bankTransfer : t.confirmation.cash;
  const qrUrl = vietQrImageUrl(receipt);
  const copyValue = async (key: string, value: string | null) => {
    if (!value || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => current === key ? null : current), 1800);
    } catch {
      setCopied(null);
    }
  };
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
        {receipt.version === 2 && <div><dt>{t.confirmation.fulfillment}</dt><dd>{receipt.fulfillmentName}</dd></div>}
        {receipt.version === 2 && receipt.deliveryAreaName && <div><dt>{t.confirmation.deliveryArea}</dt><dd>{receipt.deliveryAreaName}</dd></div>}
        {receipt.version === 2 && receipt.deliveryWindowLabel && <div><dt>{t.confirmation.deliveryWindow}</dt><dd>{receipt.deliveryWindowLabel}</dd></div>}
        <div><dt>{t.confirmation.subtotal}</dt><dd>{formatVnd(receipt.subtotalAmount)}</dd></div>
        <div><dt>{t.confirmation.deliveryFee}</dt><dd>{receipt.deliveryFeeAmount === null ? t.confirmation.feePending : formatVnd(receipt.deliveryFeeAmount)}</dd></div>
        <div><dt>{t.confirmation.total}</dt><dd>{receipt.totalAmount === null ? t.confirmation.totalPending : formatVnd(receipt.totalAmount)}</dd></div>
      </dl>
      <p className="confirmation-payment-note">{receipt.paymentMethod === "BANK_TRANSFER" ? t.confirmation.bankNote : t.confirmation.cashNote}</p>
    </section>
    {receipt.version === 2 && receipt.paymentMethod === "BANK_TRANSFER" && <section className="confirmation-payment" aria-labelledby="confirmation-payment-title">
      <header><h2 id="confirmation-payment-title">{t.confirmation.paymentDetails}</h2><p>{receipt.paymentInstruction}</p></header>
      <div className="confirmation-payment__layout">
        <div className="confirmation-qr">
          {qrUrl && !qrFailed ? <img src={qrUrl} alt={formatMessage(t.confirmation.qrAlt, { code: receipt.orderNumber })} onError={() => setQrFailed(true)} /> : <p role="status">{t.confirmation.qrUnavailable}</p>}
        </div>
        <dl>
          <div><dt>{t.confirmation.paymentAmount}</dt><dd><strong>{receipt.totalAmount === null ? t.confirmation.totalPending : formatVnd(receipt.totalAmount)}</strong></dd></div>
          <div><dt>{t.confirmation.bank}</dt><dd>{receipt.bankName}</dd></div>
          <div><dt>{t.confirmation.accountNumber}</dt><dd><span>{receipt.accountNumber}</span>{receipt.accountNumber && <button type="button" onClick={() => void copyValue("account", receipt.accountNumber)}>{copied === "account" ? t.confirmation.copied : t.confirmation.copy}</button>}</dd></div>
          <div><dt>{t.confirmation.accountHolder}</dt><dd>{receipt.accountHolder}</dd></div>
          <div><dt>{t.confirmation.transferReference}</dt><dd><span>{receipt.paymentReference}</span>{receipt.paymentReference && <button type="button" onClick={() => void copyValue("reference", receipt.paymentReference)}>{copied === "reference" ? t.confirmation.copied : t.confirmation.copy}</button>}</dd></div>
          {receipt.paymentDeadlineAt && <div><dt>{t.confirmation.paymentDeadline}</dt><dd><time dateTime={receipt.paymentDeadlineAt}>{new Intl.DateTimeFormat(receipt.locale === "ko" ? "ko-KR" : "vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(receipt.paymentDeadlineAt))}</time></dd></div>}
        </dl>
      </div>
    </section>}
    {receipt.version === 2 && receipt.paymentMethod === "CASH" && receipt.paymentInstruction && <section className="confirmation-payment confirmation-payment--cash"><h2>{t.confirmation.paymentDetails}</h2><p>{receipt.paymentInstruction}</p></section>}
    <section className="confirmation-next" aria-labelledby="confirmation-next-title"><h2 id="confirmation-next-title">{t.confirmation.nextTitle}</h2><p>{t.confirmation.nextText}</p></section>
    <Link className="button button--outline" to={path("/flowers")}>{t.confirmation.continueShopping}</Link>
  </section></PageFrame>;
}
