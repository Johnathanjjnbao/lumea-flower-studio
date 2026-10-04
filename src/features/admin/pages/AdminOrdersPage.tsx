import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { formatMessage, useI18n } from "../../../i18n";
import { formatVnd } from "../../../utils/product";
import { ORDER_PAGE_SIZE, ORDER_STATUSES } from "../orders/domain";
import { createAdminOrdersRepository } from "../orders/repository";
import type { AdminOrderFilters, AdminOrderPage, PaymentStatus } from "../orders/types";

const PAYMENT_STATUSES: readonly PaymentStatus[] = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"];

const EMPTY_FILTERS: AdminOrderFilters = {
  search: "",
  status: "ALL",
  paymentStatus: "ALL",
  deliveryFrom: "",
  deliveryTo: "",
  page: 1,
};

function formatDate(value: string, locale: "vi" | "ko", includeTime = false) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "ko-KR", includeTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "medium" }).format(new Date(value));
}

export function AdminOrdersPage() {
  const { locale, path, t } = useI18n();
  const repository = useMemo(() => createAdminOrdersRepository(), []);
  const [draft, setDraft] = useState<AdminOrderFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<AdminOrderFilters>(EMPTY_FILTERS);
  const [result, setResult] = useState<AdminOrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { document.title = `${t.adminOrders.list.title} — Luméa Admin`; }, [t.adminOrders.list.title]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    repository.listOrders(filters)
      .then((next) => { if (active) setResult(next); })
      .catch(() => { if (active) setError(t.adminOrders.list.errorTitle); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, reloadKey, repository, t.adminOrders.list.errorTitle]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...draft, page: 1 });
  };
  const clear = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  };
  const goToPage = useCallback((page: number) => {
    setDraft((current) => ({ ...current, page }));
    setFilters((current) => ({ ...current, page }));
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / ORDER_PAGE_SIZE));
  const hasFilters = Boolean(filters.search || filters.status !== "ALL" || filters.paymentStatus !== "ALL" || filters.deliveryFrom || filters.deliveryTo);
  const rows = result?.items ?? [];
  const from = rows.length ? (filters.page - 1) * ORDER_PAGE_SIZE + 1 : 0;
  const to = rows.length ? from + rows.length - 1 : 0;

  const orderSummary = (order: AdminOrderPage["items"][number]) => <>
    <strong>{order.orderNumber}</strong>
    <small>{formatDate(order.placedAt, locale, true)}</small>
  </>;
  const customerSummary = (order: AdminOrderPage["items"][number]) => <>
    <strong>{order.buyerName}</strong><small>{order.buyerPhone}</small>
    <span aria-hidden="true">→</span><small>{order.recipientName} · {order.recipientPhone}</small>
  </>;

  return <section className="admin-page admin-orders-page">
    <header className="admin-page-heading"><div><span className="admin-kicker">{t.adminOrders.list.eyebrow}</span><h1>{t.adminOrders.list.title}</h1></div><p>{t.adminOrders.list.intro}</p></header>

    <form className="admin-filters admin-order-filters" aria-label={t.adminOrders.list.title} onSubmit={apply}>
      <label className="admin-search">{t.adminOrders.list.search}<input type="search" maxLength={120} placeholder={t.adminOrders.list.searchPlaceholder} value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} /></label>
      <label>{t.adminOrders.list.status}<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as AdminOrderFilters["status"] }))}><option value="ALL">{t.adminOrders.list.all}</option>{ORDER_STATUSES.map((status) => <option key={status} value={status}>{t.adminOrders.statuses[status]}</option>)}</select></label>
      <label>{t.adminOrders.list.paymentStatus}<select value={draft.paymentStatus} onChange={(event) => setDraft((current) => ({ ...current, paymentStatus: event.target.value as AdminOrderFilters["paymentStatus"] }))}><option value="ALL">{t.adminOrders.list.all}</option>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{t.adminOrders.paymentStatuses[status]}</option>)}</select></label>
      <label>{t.adminOrders.list.deliveryFrom}<input type="date" value={draft.deliveryFrom} max={draft.deliveryTo || undefined} onChange={(event) => setDraft((current) => ({ ...current, deliveryFrom: event.target.value }))} /></label>
      <label>{t.adminOrders.list.deliveryTo}<input type="date" value={draft.deliveryTo} min={draft.deliveryFrom || undefined} onChange={(event) => setDraft((current) => ({ ...current, deliveryTo: event.target.value }))} /></label>
      <div className="admin-order-filters__actions"><button className="admin-button admin-button--primary" type="submit">{t.adminOrders.list.applyFilters}</button><button className="admin-button admin-button--secondary" type="button" onClick={clear}>{t.adminOrders.list.clearFilters}</button></div>
    </form>

    {error && <div className="admin-alert admin-alert--error admin-orders-error" role="alert"><span>{error}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)}>{t.adminOrders.list.retry}</button></div>}
    {loading && !result ? <div className="admin-empty" aria-busy="true">{t.adminOrders.list.loading}</div> : !error && rows.length === 0 ? <div className="admin-empty"><h2>{hasFilters ? t.adminOrders.list.noResultsTitle : t.adminOrders.list.emptyTitle}</h2><p>{hasFilters ? t.adminOrders.list.noResultsText : t.adminOrders.list.emptyText}</p>{hasFilters && <button className="admin-button admin-button--secondary" type="button" onClick={clear}>{t.adminOrders.list.clearFilters}</button>}</div> : rows.length > 0 && <>
      <div className="admin-order-table-wrap"><table className="admin-order-table"><thead><tr><th>{t.adminOrders.list.order}</th><th>{t.adminOrders.list.customer}</th><th>{t.adminOrders.list.items}</th><th>{t.adminOrders.list.delivery}</th><th>{t.adminOrders.list.amount}</th><th><span className="sr-only">{t.adminOrders.list.open}</span></th></tr></thead><tbody>{rows.map((order) => <tr key={order.id}>
        <td><div className="admin-order-code">{orderSummary(order)}<span className={`admin-order-status admin-order-status--${order.status.toLowerCase()}`}>{t.adminOrders.statuses[order.status]}</span></div></td>
        <td><div className="admin-order-customer">{customerSummary(order)}</div></td>
        <td><div className="admin-order-item-summary"><strong>{order.itemSummary}</strong><small>{order.itemCount} item</small></div></td>
        <td><time dateTime={order.requestedDate}>{formatDate(order.requestedDate, locale)}</time></td>
        <td><strong className="admin-price">{formatVnd(order.subtotalAmount)}</strong><small className="admin-table-secondary">{t.adminOrders.paymentStatuses[order.paymentStatus]}</small></td>
        <td><Link className="admin-row-link" to={path(`/admin/orders/${order.id}`)} aria-label={formatMessage(t.adminOrders.list.open, { code: order.orderNumber })}>→</Link></td>
      </tr>)}</tbody></table></div>
      <div className="admin-order-cards">{rows.map((order) => <article key={order.id} className="admin-order-card"><header><div className="admin-order-code">{orderSummary(order)}</div><span className={`admin-order-status admin-order-status--${order.status.toLowerCase()}`}>{t.adminOrders.statuses[order.status]}</span></header><div className="admin-order-customer">{customerSummary(order)}</div><p>{order.itemSummary}</p><dl><div><dt>{t.adminOrders.list.delivery}</dt><dd>{formatDate(order.requestedDate, locale)}</dd></div><div><dt>{t.adminOrders.list.amount}</dt><dd>{formatVnd(order.subtotalAmount)}</dd></div><div><dt>{t.adminOrders.list.paymentStatus}</dt><dd>{t.adminOrders.paymentStatuses[order.paymentStatus]}</dd></div></dl><Link className="admin-button admin-button--secondary" to={path(`/admin/orders/${order.id}`)}>{formatMessage(t.adminOrders.list.open, { code: order.orderNumber })}</Link></article>)}</div>
      <nav className="admin-order-pagination" aria-label={t.adminOrders.list.page.replace("{current}", String(filters.page)).replace("{total}", String(totalPages))}><p>{formatMessage(t.adminOrders.list.results, { from, to, total: result?.total ?? 0 })}</p><span>{formatMessage(t.adminOrders.list.page, { current: filters.page, total: totalPages })}</span><div><button className="admin-button admin-button--secondary" type="button" disabled={filters.page <= 1 || loading} onClick={() => goToPage(filters.page - 1)}>{t.adminOrders.list.previous}</button><button className="admin-button admin-button--secondary" type="button" disabled={filters.page >= totalPages || loading} onClick={() => goToPage(filters.page + 1)}>{t.adminOrders.list.next}</button></div></nav>
    </>}
  </section>;
}
