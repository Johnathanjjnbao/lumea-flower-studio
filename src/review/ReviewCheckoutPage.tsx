import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { useCart } from "../features/cart/CartContext";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useI18n } from "../i18n";
import { formatVnd } from "../utils/product";
import { getReviewCheckoutOptions } from "./fixtures";

// Review-only UI: no identifying fields, payment details, Order RPC or receipt.
export function ReviewCheckoutPage() {
  const { locale, t, path } = useI18n();
  const { lines, reconcileCart } = useCart();
  const options = getReviewCheckoutOptions(locale);
  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">("PICKUP");
  const [checking, setChecking] = useState(lines.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const lock = useRef(false);
  useDocumentMetadata(t.meta.checkoutTitle, t.meta.checkoutDescription);

  useEffect(() => {
    if (!lines.length) return;
    let active = true;
    void reconcileCart().catch(() => {
      if (active) setError(t.checkout.errors.network);
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
    // Reconcile on entry; a second check is required before demo completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconcileCart]);

  const fee = fulfillment === "PICKUP" ? 0 : options.zones[0].feeAmount;
  const subtotal = lines.reduce((sum, line) => line.validation.state === "valid" || line.validation.state === "changed"
    ? sum + line.quantity * line.unitPriceSnapshot : sum, 0);
  const unavailable = lines.some((line) => line.validation.state !== "valid");

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || checking) return;
    lock.current = true;
    setChecking(true);
    setError(null);
    try {
      const checked = await reconcileCart();
      if (checked.length === 0 || checked.some((line) => line.validation.state !== "valid")) {
        setError(t.checkout.errors.itemUnavailable);
        return;
      }
      setComplete(true);
    } catch {
      setError(t.checkout.errors.network);
    } finally {
      lock.current = false;
      setChecking(false);
    }
  }

  if (complete) return <PageFrame><section className="review-complete section-shell section-space" role="status" aria-labelledby="review-complete-title">
    <p className="eyebrow">LUMÉA · REVIEW MODE</p>
    <h1 id="review-complete-title">{locale === "vi" ? "Đã hoàn tất bản xem trước" : "미리보기 과정을 마쳤습니다"}</h1>
    <p>{locale === "vi" ? "Đây chỉ là mô phỏng. Không có đơn hàng, thanh toán hay dữ liệu cá nhân nào được gửi đi." : "이 화면은 시뮬레이션입니다. 주문, 결제 또는 개인정보가 전송되지 않았습니다."}</p>
    <p>{locale === "vi" ? `Tạm tính minh họa: ${formatVnd(subtotal + fee)}` : `예시 합계: ${formatVnd(subtotal + fee)}`}</p>
    <Link className="button button--solid" to={path("/flowers")}>{locale === "vi" ? "Tiếp tục xem hoa" : "꽃 더 보기"}</Link>
  </section></PageFrame>;

  if (lines.length === 0) return <PageFrame><section className="checkout-empty section-shell section-space" aria-labelledby="checkout-empty-title">
    <h1 id="checkout-empty-title">{t.checkout.emptyTitle}</h1>
    <p>{t.checkout.emptyText}</p>
    <Link className="button button--solid" to={path("/flowers")}>{t.checkout.shopFlowers}</Link>
  </section></PageFrame>;

  return <PageFrame><section className="checkout-page section-shell section-space" aria-labelledby="checkout-title">
    <Link className="checkout-back" to={path("/cart")}>{t.checkout.backToCart}</Link>
    <header className="checkout-page__header">
      <p className="eyebrow">LUMÉA · REVIEW MODE</p>
      <h1 id="checkout-title">{t.checkout.title}</h1>
      <p>{locale === "vi" ? "Chỉ chọn cách nhận hoa để xem tạm tính minh họa. Không nhập thông tin cá nhân; không có đơn hàng hoặc thanh toán thật." : "예시 수령 방법과 합계를 확인하세요. 개인정보를 입력하지 않으며 실제 주문이나 결제는 이루어지지 않습니다."}</p>
    </header>
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={(event) => void finish(event)}>
        {error && <p className="checkout-server-error" role="alert">{error}</p>}
        {unavailable && !checking && <p className="checkout-server-error" role="alert">{t.checkout.cartNeedsReviewText} <Link to={path("/cart")}>{t.checkout.reviewCart}</Link></p>}
        <section className="checkout-section">
          <header><h2>{t.checkout.sections.delivery}</h2><p>{locale === "vi" ? "Các lựa chọn dưới đây chỉ là ví dụ, không đặt lịch giao hoặc nhận hoa." : "아래 선택지는 예시이며 배송이나 수령 일정이 예약되지 않습니다."}</p></header>
          <fieldset className="checkout-payment checkout-fulfillment">
            <legend>{t.checkout.fields.fulfillmentType}</legend>
            <label className="checkout-choice checkout-choice--radio" data-selected={fulfillment === "PICKUP"}>
              <input type="radio" name="reviewFulfillment" value="PICKUP" checked={fulfillment === "PICKUP"} onChange={() => setFulfillment("PICKUP")} />
              <span><strong>{t.checkout.fulfillment.pickup}</strong><small>{options.pickup?.name}</small></span>
            </label>
            <label className="checkout-choice checkout-choice--radio" data-selected={fulfillment === "DELIVERY"}>
              <input type="radio" name="reviewFulfillment" value="DELIVERY" checked={fulfillment === "DELIVERY"} onChange={() => setFulfillment("DELIVERY")} />
              <span><strong>{t.checkout.fulfillment.delivery}</strong><small>{options.deliveryHelp}</small></span>
            </label>
          </fieldset>
        </section>
        <section className="checkout-section">
          <header><h2>{t.checkout.sections.review}</h2></header>
          <button className="button button--solid checkout-submit" type="submit" disabled={checking || unavailable}>{locale === "vi" ? "Xem kết thúc demo" : "데모 종료 화면 보기"}</button>
          <p className="checkout-submit-note">{locale === "vi" ? "Không tạo đơn hàng hoặc thanh toán thật." : "실제 주문이나 결제는 생성되지 않습니다."}</p>
        </section>
      </form>
      <aside className="checkout-summary" aria-labelledby="review-summary-title">
        <p className="checkout-summary__eyebrow">{t.checkout.summaryEyebrow}</p>
        <h2 id="review-summary-title">{t.checkout.summaryTitle}</h2>
        <ul>{lines.map((line) => <li className="checkout-summary-line" key={line.id}><strong>{line.type === "READY_MADE_PRODUCT" ? line.display.productName : t.checkout.customBouquet}</strong><span>{formatVnd(line.unitPriceSnapshot * line.quantity)}</span></li>)}</ul>
        <dl><div><dt>{t.checkout.merchandiseSubtotal}</dt><dd>{formatVnd(subtotal)}</dd></div><div><dt>{t.checkout.deliveryFee}</dt><dd>{formatVnd(fee)}</dd></div><div className="checkout-summary__total"><dt>{t.checkout.total}</dt><dd>{formatVnd(subtotal + fee)}</dd></div></dl>
      </aside>
    </div>
  </section></PageFrame>;
}
