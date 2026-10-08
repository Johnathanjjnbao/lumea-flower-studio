import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatMessage, useI18n } from "../../../i18n";
import { formatVnd } from "../../../utils/product";
import { DELIVERY_TRANSITIONS, ORDER_TRANSITIONS, orderErrorCode } from "../orders/domain";
import { createAdminOrdersRepository } from "../orders/repository";
import type { AdminOrderDetail, DeliveryStatus, NextOrderStatus } from "../orders/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value: string, locale: "vi" | "ko", includeTime = false) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "ko-KR", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "long" }).format(new Date(value));
}

export function AdminOrderDetailPage() {
  const { id = "" } = useParams();
  const { locale, path, t } = useI18n();
  const repository = useMemo(() => createAdminOrdersRepository(), []);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pendingStatus, setPendingStatus] = useState<NextOrderStatus | null>(null);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [pendingDeliveryStatus, setPendingDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (quiet = false) => {
    if (!UUID_PATTERN.test(id)) { setNotFound(true); setLoading(false); return; }
    if (!quiet) setLoading(true);
    setError(false);
    try {
      const next = await repository.getOrder(id);
      setDetail(next);
      setNotFound(next === null);
    } catch {
      setError(true);
    } finally { setLoading(false); }
  }, [id, repository]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { document.title = `${detail?.order.order_number ?? t.adminOrders.detail.eyebrow} — Luméa Admin`; }, [detail?.order.order_number, t.adminOrders.detail.eyebrow]);
  useEffect(() => {
    if (pendingStatus || pendingPayment || pendingDeliveryStatus) window.requestAnimationFrame(() => confirmRef.current?.focus());
  }, [pendingDeliveryStatus, pendingPayment, pendingStatus]);

  const transition = async () => {
    if (!detail || !pendingStatus || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await repository.transitionStatus(detail.order.id, detail.order.status, pendingStatus);
      setPendingStatus(null);
      setNotice({ tone: "success", text: t.adminOrders.actions.success });
      await load(true);
    } catch (reason) {
      const code = orderErrorCode(reason);
      if (code === "ORDER_STATUS_CONFLICT") {
        setPendingStatus(null);
        setNotice({ tone: "error", text: t.adminOrders.actions.conflict });
        await load(true);
      } else if (code === "ORDER_STATUS_INVALID_TRANSITION") {
        setPendingStatus(null);
        setNotice({ tone: "error", text: t.adminOrders.actions.invalid });
        await load(true);
      } else setNotice({ tone: "error", text: t.adminOrders.actions.error });
    } finally { setBusy(false); }
  };

  const confirmPayment = async () => {
    if (!detail || !pendingPayment || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await repository.markPaymentPaid(detail.payment.id, detail.payment.status);
      setPendingPayment(false);
      setNotice({ tone: "success", text: t.adminOrders.paymentActions.success });
      await load(true);
    } catch (reason) {
      const code = orderErrorCode(reason);
      if (code === "PAYMENT_STATUS_CONFLICT" || code === "PAYMENT_STATUS_INVALID_TRANSITION") {
        setPendingPayment(false);
        setNotice({ tone: "error", text: t.adminOrders.paymentActions.conflict });
        await load(true);
      } else setNotice({ tone: "error", text: t.adminOrders.paymentActions.error });
    } finally { setBusy(false); }
  };

  const transitionDelivery = async () => {
    if (!detail?.delivery || !pendingDeliveryStatus || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await repository.transitionDelivery(detail.delivery.id, detail.delivery.status, pendingDeliveryStatus);
      setPendingDeliveryStatus(null);
      setNotice({ tone: "success", text: t.adminOrders.deliveryActions.success });
      await load(true);
    } catch (reason) {
      const code = orderErrorCode(reason);
      if (code === "DELIVERY_STATUS_CONFLICT" || code === "DELIVERY_STATUS_INVALID_TRANSITION") {
        setPendingDeliveryStatus(null);
        setNotice({ tone: "error", text: t.adminOrders.deliveryActions.conflict });
        await load(true);
      } else setNotice({ tone: "error", text: t.adminOrders.deliveryActions.error });
    } finally { setBusy(false); }
  };

  if (loading && !detail) return <section className="admin-page"><div className="admin-empty" aria-busy="true">{t.adminOrders.detail.loading}</div></section>;
  if (notFound) return <section className="admin-page"><Link className="admin-back-link" to={path("/admin/orders")}>{t.adminOrders.detail.back}</Link><div className="admin-empty"><h1>{t.adminOrders.detail.notFoundTitle}</h1><p>{t.adminOrders.detail.notFoundText}</p></div></section>;
  if (!detail) return <section className="admin-page"><Link className="admin-back-link" to={path("/admin/orders")}>{t.adminOrders.detail.back}</Link><div className="admin-empty"><h1>{t.adminOrders.detail.errorTitle}</h1><button className="admin-button admin-button--secondary" type="button" onClick={() => void load()}>{t.adminOrders.detail.retry}</button></div></section>;

  const { order, recipient, address, delivery, payment, items, events, paymentEvents, deliveryEvents } = detail;
  const nextStatuses = ORDER_TRANSITIONS[order.status];
  const nextDeliveryStatuses = delivery ? DELIVERY_TRANSITIONS[delivery.status] : [];

  return <section className="admin-page admin-order-detail">
    <header className="admin-order-detail__header"><div><Link to={path("/admin/orders")}>{t.adminOrders.detail.back}</Link><span className="admin-kicker">{t.adminOrders.detail.eyebrow}</span><h1>{order.order_number}</h1><p>{formatMessage(t.adminOrders.detail.placedAt, { time: formatDate(order.placed_at, locale, true) })}</p></div><span className={`admin-order-status admin-order-status--${order.status.toLowerCase()}`}>{t.adminOrders.statuses[order.status]}</span></header>
    {notice && <div className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</div>}
    {error && <div className="admin-alert admin-alert--error" role="alert">{t.adminOrders.detail.errorTitle}</div>}

    <section className="admin-order-next" aria-labelledby="order-next-title"><div><span className="admin-kicker">{t.adminOrders.detail.nextStep}</span><h2 id="order-next-title">{t.adminOrders.statuses[order.status]}</h2>{nextStatuses.length === 0 && <p>{t.adminOrders.detail.terminal}</p>}</div>{nextStatuses.length > 0 && <div className="admin-order-next__actions">{nextStatuses.map((status) => <button key={status} type="button" className={status === "CANCELLED" ? "admin-danger-button" : "admin-button admin-button--primary"} disabled={busy} onClick={() => setPendingStatus(status)}>{t.adminOrders.actions[status]}</button>)}</div>}</section>

    {pendingStatus && <section className="admin-order-confirm" role="alertdialog" aria-labelledby="order-confirm-title" aria-describedby="order-confirm-text"><div><span className="admin-kicker">{t.adminOrders.actions.confirmTitle}</span><h2 id="order-confirm-title">{t.adminOrders.actions[pendingStatus]}</h2><p id="order-confirm-text">{pendingStatus === "CANCELLED" ? formatMessage(t.adminOrders.actions.dangerousText, { code: order.order_number }) : formatMessage(t.adminOrders.actions.confirmText, { code: order.order_number, from: t.adminOrders.statuses[order.status], to: t.adminOrders.statuses[pendingStatus] })}</p></div><div><button type="button" className="admin-button admin-button--secondary" disabled={busy} onClick={() => setPendingStatus(null)}>{t.adminOrders.actions.cancel}</button><button ref={confirmRef} type="button" className={pendingStatus === "CANCELLED" ? "admin-button admin-order-cancel-confirm" : "admin-button admin-button--primary"} disabled={busy} onClick={() => void transition()}>{busy ? t.adminOrders.actions.updating : t.adminOrders.actions.confirm}</button></div></section>}

    {pendingPayment && <section className="admin-order-confirm" role="alertdialog" aria-labelledby="payment-confirm-title" aria-describedby="payment-confirm-text"><div><span className="admin-kicker">{t.adminOrders.paymentActions.confirmTitle}</span><h2 id="payment-confirm-title">{t.adminOrders.paymentActions.markPaid}</h2><p id="payment-confirm-text">{formatMessage(t.adminOrders.paymentActions.confirmText, { code: order.order_number, amount: formatVnd(payment.amount ?? order.total_amount ?? 0) })}</p></div><div><button type="button" className="admin-button admin-button--secondary" disabled={busy} onClick={() => setPendingPayment(false)}>{t.adminOrders.actions.cancel}</button><button ref={confirmRef} type="button" className="admin-button admin-button--primary" disabled={busy} onClick={() => void confirmPayment()}>{busy ? t.adminOrders.actions.updating : t.adminOrders.paymentActions.confirm}</button></div></section>}

    {pendingDeliveryStatus && delivery && <section className="admin-order-confirm" role="alertdialog" aria-labelledby="delivery-confirm-title" aria-describedby="delivery-confirm-text"><div><span className="admin-kicker">{t.adminOrders.deliveryActions.confirmTitle}</span><h2 id="delivery-confirm-title">{t.adminOrders.deliveryStatuses[pendingDeliveryStatus]}</h2><p id="delivery-confirm-text">{formatMessage(t.adminOrders.deliveryActions.confirmText, { code: order.order_number, from: t.adminOrders.deliveryStatuses[delivery.status], to: t.adminOrders.deliveryStatuses[pendingDeliveryStatus] })}</p></div><div><button type="button" className="admin-button admin-button--secondary" disabled={busy} onClick={() => setPendingDeliveryStatus(null)}>{t.adminOrders.actions.cancel}</button><button ref={confirmRef} type="button" className={pendingDeliveryStatus === "CANCELLED" ? "admin-button admin-order-cancel-confirm" : "admin-button admin-button--primary"} disabled={busy} onClick={() => void transitionDelivery()}>{busy ? t.adminOrders.actions.updating : t.adminOrders.deliveryActions.confirm}</button></div></section>}

    <div className="admin-order-detail__grid">
      <section className="admin-order-panel"><span className="admin-order-panel__number">01</span><h2>{t.adminOrders.detail.buyer}</h2><dl><div><dt>{t.adminOrders.detail.name}</dt><dd>{order.buyer_name}</dd></div><div><dt>{t.adminOrders.detail.phone}</dt><dd><a href={`tel:${order.buyer_phone}`}>{order.buyer_phone}</a></dd></div><div><dt>{t.adminOrders.detail.email}</dt><dd>{order.buyer_email ? <a href={`mailto:${order.buyer_email}`}>{order.buyer_email}</a> : t.adminOrders.detail.noEmail}</dd></div></dl></section>
      <section className="admin-order-panel"><span className="admin-order-panel__number">02</span><h2>{t.adminOrders.detail.recipient}</h2><dl><div><dt>{t.adminOrders.detail.name}</dt><dd>{recipient.name}</dd></div><div><dt>{t.adminOrders.detail.phone}</dt><dd><a href={`tel:${recipient.phone}`}>{recipient.phone}</a></dd></div></dl><p>{order.buyer_is_recipient ? t.adminOrders.detail.buyerIsRecipient : t.adminOrders.detail.differentRecipient}</p><p>{order.is_surprise ? t.adminOrders.detail.surprise : t.adminOrders.detail.regularDelivery}</p></section>
      <section className="admin-order-panel admin-order-panel--wide">
        <span className="admin-order-panel__number">03</span>
        <h2>{order.fulfillment_type === "PICKUP" ? t.adminOrders.detail.pickup : t.adminOrders.detail.delivery}</h2>
        <dl className="admin-order-panel__columns">
          <div><dt>{t.adminOrders.detail.fulfillmentType}</dt><dd>{order.fulfillment_type === "PICKUP" ? t.adminOrders.detail.pickup : t.adminOrders.detail.delivery}</dd></div>
          <div><dt>{t.adminOrders.detail.requestedDate}</dt><dd>{formatDate(order.requested_fulfillment_date, locale)}</dd></div>
          {order.fulfillment_type === "DELIVERY" ? <>
            <div><dt>{t.adminOrders.detail.zone}</dt><dd>{order.delivery_zone_name_snapshot ?? t.adminOrders.detail.snapshotUnavailableShort}</dd></div>
            <div><dt>{t.adminOrders.detail.area}</dt><dd>{order.delivery_area_name_snapshot ?? t.adminOrders.detail.snapshotUnavailableShort}</dd></div>
            <div><dt>{t.adminOrders.detail.requestedWindow}</dt><dd>{order.delivery_window_label_snapshot ?? delivery?.requested_window ?? t.adminOrders.detail.noWindow}</dd></div>
            <div><dt>{t.adminOrders.detail.address}</dt><dd>{address?.address_text ?? t.adminOrders.detail.snapshotUnavailableShort}</dd></div>
            <div><dt>{t.adminOrders.detail.notes}</dt><dd>{delivery?.delivery_notes || t.adminOrders.detail.noNotes}</dd></div>
            <div><dt>{t.adminOrders.list.status}</dt><dd>{delivery ? t.adminOrders.deliveryStatuses[delivery.status] : t.adminOrders.detail.snapshotUnavailableShort}</dd></div>
          </> : <>
            <div><dt>{t.adminOrders.detail.pickupName}</dt><dd>{order.pickup_name_snapshot ?? t.adminOrders.detail.snapshotUnavailableShort}</dd></div>
            <div><dt>{t.adminOrders.detail.pickupAddress}</dt><dd>{order.pickup_address_snapshot ?? t.adminOrders.detail.snapshotUnavailableShort}</dd></div>
            <div><dt>{t.adminOrders.detail.pickupHours}</dt><dd>{order.pickup_hours_snapshot ?? t.adminOrders.detail.snapshotUnavailableShort}</dd></div>
          </>}
          <div><dt>{t.adminOrders.detail.cardMessage}</dt><dd>{order.card_message || t.adminOrders.detail.noMessage}</dd></div>
        </dl>
        {delivery && nextDeliveryStatuses.length > 0 && <div className="admin-order-panel__actions" aria-label={t.adminOrders.deliveryActions.ariaLabel}>{nextDeliveryStatuses.map((status) => <button key={status} type="button" className={status === "CANCELLED" || status === "FAILED" ? "admin-danger-button" : "admin-button admin-button--secondary"} disabled={busy} onClick={() => setPendingDeliveryStatus(status)}>{t.adminOrders.deliveryActions[status]}</button>)}</div>}
      </section>
    </div>

    <section className="admin-order-items" aria-labelledby="order-items-title"><header><span className="admin-kicker">04 · ORDER COMPOSITION</span><h2 id="order-items-title">{t.adminOrders.detail.items}</h2></header><div>{items.map((item) => <article key={item.id} className="admin-order-item"><header><div><span>{item.item_type === "CUSTOM_BOUQUET" ? t.adminOrders.detail.customBouquet : t.adminOrders.detail.readyMade}</span><h3>{item.product_name_snapshot}</h3></div><strong>{formatVnd(item.line_total)}</strong></header><dl><div><dt>{t.adminOrders.detail.quantity}</dt><dd>{item.quantity}</dd></div><div><dt>{t.adminOrders.detail.unitPrice}</dt><dd>{formatVnd(item.unit_price_snapshot)}</dd></div>{item.item_type === "READY_MADE_PRODUCT" && <><div><dt>{t.adminOrders.detail.variant}</dt><dd>{item.variant_name_snapshot}</dd></div><div><dt>SKU</dt><dd>{item.sku_snapshot ?? "—"}</dd></div>{item.tone_name_snapshot && <div><dt>{t.adminOrders.detail.tone}</dt><dd>{item.tone_name_snapshot}</dd></div>}</>}</dl>{item.item_type === "CUSTOM_BOUQUET" && (item.bouquet ? <div className="admin-order-bouquet"><div><h4>{t.adminOrders.detail.flowers}</h4><ul>{item.bouquet.flowers.map((flower) => <li key={flower.flowerId}><span>{flower.name} × {flower.quantity}</span><strong>{formatVnd(flower.lineTotal)}</strong></li>)}</ul><p>{t.adminOrders.detail.totalStems}: <strong>{item.bouquet.totalStems}</strong></p></div><div><h4>{t.adminOrders.detail.wrapping}</h4><p>{item.bouquet.wrapping.typeName} · {item.bouquet.wrapping.variantName}</p>{item.bouquet.wrapping.swatch && <i aria-hidden="true" style={{ background: item.bouquet.wrapping.swatch }} />}</div></div> : <p className="admin-inline-empty">{t.adminOrders.detail.snapshotUnavailable}</p>)}</article>)}</div></section>

    <div className="admin-order-detail__grid admin-order-detail__grid--bottom">
      <section className="admin-order-panel"><span className="admin-order-panel__number">05</span><h2>{t.adminOrders.detail.payment}</h2><dl><div><dt>{t.adminOrders.detail.method}</dt><dd>{t.adminOrders.paymentMethods[payment.method]}</dd></div><div><dt>{t.adminOrders.detail.paymentStatus}</dt><dd>{t.adminOrders.paymentStatuses[payment.status]}</dd></div><div><dt>{t.adminOrders.detail.paymentAmount}</dt><dd>{payment.amount === null ? t.adminOrders.detail.noPaymentAmount : formatVnd(payment.amount)}</dd></div><div><dt>{t.adminOrders.detail.merchandiseSubtotal}</dt><dd>{formatVnd(order.subtotal_amount)}</dd></div><div><dt>{t.adminOrders.detail.deliveryFee}</dt><dd>{order.delivery_fee_amount === null ? t.adminOrders.detail.deliveryPending : formatVnd(order.delivery_fee_amount)}</dd></div><div><dt>{t.adminOrders.detail.total}</dt><dd>{order.total_amount === null ? t.adminOrders.detail.totalPending : formatVnd(order.total_amount)}</dd></div>{payment.payment_reference && <div><dt>{t.adminOrders.detail.paymentReference}</dt><dd>{payment.payment_reference}</dd></div>}{payment.bank_name_snapshot && <div><dt>{t.adminOrders.detail.bankAccount}</dt><dd>{payment.bank_name_snapshot} · {payment.account_number_snapshot}<br />{payment.account_holder_snapshot}</dd></div>}{payment.payment_deadline_at && <div><dt>{t.adminOrders.detail.paymentDeadline}</dt><dd>{formatDate(payment.payment_deadline_at, locale, true)}</dd></div>}{payment.paid_at && <div><dt>{t.adminOrders.detail.paidAt}</dt><dd>{formatDate(payment.paid_at, locale, true)}</dd></div>}</dl>{(["UNPAID", "PENDING"] as const).includes(payment.status as "UNPAID" | "PENDING") && payment.amount !== null && <div className="admin-order-panel__actions"><button type="button" className="admin-button admin-button--primary" disabled={busy} onClick={() => setPendingPayment(true)}>{t.adminOrders.paymentActions.markPaid}</button></div>}</section>
      <section className="admin-order-panel"><span className="admin-order-panel__number">06</span><h2>{t.adminOrders.detail.history}</h2><ol className="admin-order-history">{events.map((event) => <li key={event.id}><i aria-hidden="true" /><div><strong>{event.from_status ? formatMessage(t.adminOrders.detail.changedEvent, { from: t.adminOrders.statuses[event.from_status], to: t.adminOrders.statuses[event.to_status] }) : t.adminOrders.detail.initialEvent}</strong><time dateTime={event.created_at}>{formatDate(event.created_at, locale, true)}</time><small>{event.actorName ? formatMessage(t.adminOrders.detail.actor, { name: event.actorName }) : t.adminOrders.detail.systemActor}</small>{event.reason && event.reason !== "ORDER_PLACED" && <small>{formatMessage(t.adminOrders.detail.reason, { reason: event.reason })}</small>}</div></li>)}</ol></section>
      {paymentEvents.length > 0 && <section className="admin-order-panel"><span className="admin-order-panel__number">07</span><h2>{t.adminOrders.detail.paymentHistory}</h2><ol className="admin-order-history">{paymentEvents.map((event) => <li key={event.id}><i aria-hidden="true" /><div><strong>{event.from_status ? formatMessage(t.adminOrders.detail.changedEvent, { from: t.adminOrders.paymentStatuses[event.from_status], to: t.adminOrders.paymentStatuses[event.to_status] }) : t.adminOrders.detail.paymentRecorded}</strong><time dateTime={event.created_at}>{formatDate(event.created_at, locale, true)}</time><small>{event.actorName ? formatMessage(t.adminOrders.detail.actor, { name: event.actorName }) : t.adminOrders.detail.systemActor}</small>{event.reason && <small>{formatMessage(t.adminOrders.detail.reason, { reason: event.reason })}</small>}</div></li>)}</ol></section>}
      {deliveryEvents.length > 0 && <section className="admin-order-panel"><span className="admin-order-panel__number">08</span><h2>{t.adminOrders.detail.deliveryHistory}</h2><ol className="admin-order-history">{deliveryEvents.map((event) => <li key={event.id}><i aria-hidden="true" /><div><strong>{event.from_status ? formatMessage(t.adminOrders.detail.changedEvent, { from: t.adminOrders.deliveryStatuses[event.from_status], to: t.adminOrders.deliveryStatuses[event.to_status] }) : t.adminOrders.detail.deliveryRecorded}</strong><time dateTime={event.created_at}>{formatDate(event.created_at, locale, true)}</time><small>{event.actorName ? formatMessage(t.adminOrders.detail.actor, { name: event.actorName }) : t.adminOrders.detail.systemActor}</small>{event.reason && <small>{formatMessage(t.adminOrders.detail.reason, { reason: event.reason })}</small>}</div></li>)}</ol></section>}
    </div>
  </section>;
}
