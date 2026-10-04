import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../../i18n";
import { formatVnd } from "../../../utils/product";
import { createAdminOperationsRepository } from "../operations/repository";
import {
  emptyDeliveryArea,
  emptyDeliveryWindow,
  emptyDeliveryZone,
  type AdminDeliveryWindow,
  type AdminDeliveryZone,
  type AdminOperationsSnapshot,
} from "../operations/types";

type Notice = { tone: "success" | "error"; text: string } | null;

export function AdminOperationsPage() {
  const { t } = useI18n();
  const repository = useMemo(() => createAdminOperationsRepository(), []);
  const [snapshot, setSnapshot] = useState<AdminOperationsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSnapshot(await repository.getSnapshot()); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : t.adminOperations.errors.load }); }
    finally { setLoading(false); }
  }, [repository, t.adminOperations.errors.load]);

  useEffect(() => { document.title = `${t.adminOperations.title} — Luméa Admin`; void load(); }, [load, t.adminOperations.title]);

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key); setNotice(null);
    try { await task(); setNotice({ tone: "success", text: t.adminOperations.saved }); await load(); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : t.adminOperations.errors.save }); }
    finally { setBusy(null); }
  };

  if (loading && !snapshot) return <section className="admin-page"><div className="admin-empty" aria-busy="true">{t.adminOperations.loading}</div></section>;
  if (!snapshot) return <section className="admin-page"><div className="admin-empty"><h1>{t.adminOperations.errors.load}</h1><button className="admin-button admin-button--secondary" type="button" onClick={() => void load()}>{t.adminOperations.retry}</button></div></section>;

  const updateZone = (index: number, next: AdminDeliveryZone) => setSnapshot((current) => current ? { ...current, zones: current.zones.map((zone, zoneIndex) => zoneIndex === index ? next : zone) } : current);
  const updateWindow = (index: number, next: AdminDeliveryWindow) => setSnapshot((current) => current ? { ...current, windows: current.windows.map((window, windowIndex) => windowIndex === index ? next : window) } : current);
  const removeArea = (zoneIndex: number, zone: AdminDeliveryZone, areaIndex: number) => {
    if (zone.areas[areaIndex]?.id && !window.confirm(t.adminOperations.areas.removeConfirm)) return;
    updateZone(zoneIndex, { ...zone, areas: zone.areas.filter((_, itemIndex) => itemIndex !== areaIndex) });
  };
  const codePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const saveIfValid = (key: string, message: string | null, task: () => Promise<void>) => {
    if (message) { setNotice({ tone: "error", text: message }); return; }
    void run(key, task);
  };
  const deliveryIssue = () => {
    const delivery = snapshot.delivery;
    if (delivery.deliveryEnabled && (!snapshot.zones.some((zone) => zone.id && zone.active && zone.areas.some((area) => area.active))
      || !snapshot.windows.some((window) => window.id && window.active))) return t.adminOperations.validation.delivery;
    if (delivery.sameDayEnabled && !delivery.sameDayCutoff) return t.adminOperations.validation.cutoff;
    if (delivery.pickupEnabled && ![
      delivery.pickupNameVi, delivery.pickupNameKo, delivery.pickupAddressVi,
      delivery.pickupAddressKo, delivery.pickupHoursVi, delivery.pickupHoursKo,
    ].every((value) => value.trim())) return t.adminOperations.validation.pickup;
    return null;
  };
  const zoneIssue = (zone: AdminDeliveryZone) => {
    if (!codePattern.test(zone.stableCode) || !zone.nameVi.trim() || !zone.nameKo.trim()
      || !Number.isSafeInteger(zone.feeAmount) || zone.feeAmount < 0 || zone.feeAmount > 9_999_999_999_999
      || !Number.isSafeInteger(zone.sortOrder) || zone.sortOrder < 0) return t.adminOperations.validation.zone;
    if (zone.active && !zone.areas.some((area) => area.active)) return t.adminOperations.validation.activeArea;
    if (zone.areas.some((area) => !codePattern.test(area.stableCode) || !area.nameVi.trim() || !area.nameKo.trim()
      || !Number.isSafeInteger(area.sortOrder) || area.sortOrder < 0)) return t.adminOperations.validation.area;
    const areaCodes = snapshot.zones.flatMap((item) => item.areas.map((area) => area.stableCode)).filter(Boolean);
    if (new Set(areaCodes).size !== areaCodes.length) return t.adminOperations.validation.duplicateCode;
    const zoneCodes = snapshot.zones.map((item) => item.stableCode).filter(Boolean);
    if (new Set(zoneCodes).size !== zoneCodes.length) return t.adminOperations.validation.duplicateCode;
    return null;
  };
  const windowIssue = (window: AdminDeliveryWindow) => {
    if (!codePattern.test(window.stableCode) || !window.labelVi.trim() || !window.labelKo.trim()
      || !window.startTime || !window.endTime || window.startTime >= window.endTime
      || !Number.isSafeInteger(window.sortOrder) || window.sortOrder < 0) return t.adminOperations.validation.window;
    const windowCodes = snapshot.windows.map((item) => item.stableCode).filter(Boolean);
    return new Set(windowCodes).size === windowCodes.length ? null : t.adminOperations.validation.duplicateCode;
  };
  const paymentIssue = () => {
    const payment = snapshot.payment;
    if (payment.bankTransferEnabled && (!payment.bankId.match(/^[A-Za-z0-9]{2,20}$/)
      || !payment.accountNumber.match(/^[A-Za-z0-9]{1,19}$/) || !payment.bankName.trim()
      || !payment.accountHolder.trim() || !payment.vietqrTemplate.match(/^[A-Za-z0-9_-]{1,40}$/)
      || !payment.transferReferenceTemplate.match(/^[A-Za-z0-9 ]*\{order_number\}[A-Za-z0-9 ]*$/)
      || (payment.paymentDeadlineHours !== null && (!Number.isSafeInteger(payment.paymentDeadlineHours)
        || payment.paymentDeadlineHours < 1 || payment.paymentDeadlineHours > 720))
      || !payment.bankInstructionsVi.trim() || !payment.bankInstructionsKo.trim())) return t.adminOperations.validation.bank;
    if (payment.cashEnabled && (!(payment.cashDeliveryEnabled || payment.cashPickupEnabled)
      || !payment.cashInstructionsVi.trim() || !payment.cashInstructionsKo.trim())) return t.adminOperations.validation.cash;
    return null;
  };

  return <section className="admin-page admin-operations-page">
    <header className="admin-page-heading"><div><span className="admin-kicker">{t.adminOperations.eyebrow}</span><h1>{t.adminOperations.title}</h1></div><p>{t.adminOperations.intro}</p></header>
    {notice && <div className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</div>}

    <section className="admin-editor-section admin-operations-section">
      <header><span>01</span><div><h2>{t.adminOperations.delivery.title}</h2><p>{t.adminOperations.delivery.intro}</p></div></header>
      <div className="admin-field-grid">
        <label className="admin-check"><input type="checkbox" checked={snapshot.delivery.deliveryEnabled} onChange={(event) => setSnapshot({ ...snapshot, delivery: { ...snapshot.delivery, deliveryEnabled: event.target.checked } })} /><span><strong>{t.adminOperations.delivery.enableDelivery}</strong><small>{t.adminOperations.delivery.enableDeliveryHelp}</small></span></label>
        <label className="admin-check"><input type="checkbox" checked={snapshot.delivery.pickupEnabled} onChange={(event) => setSnapshot({ ...snapshot, delivery: { ...snapshot.delivery, pickupEnabled: event.target.checked } })} /><span><strong>{t.adminOperations.delivery.enablePickup}</strong><small>{t.adminOperations.delivery.enablePickupHelp}</small></span></label>
        <label className="admin-check"><input type="checkbox" checked={snapshot.delivery.sameDayEnabled} onChange={(event) => setSnapshot({ ...snapshot, delivery: { ...snapshot.delivery, sameDayEnabled: event.target.checked } })} /><span><strong>{t.adminOperations.delivery.enableSameDay}</strong><small>{t.adminOperations.delivery.enableSameDayHelp}</small></span></label>
        {snapshot.delivery.sameDayEnabled && <label>{t.adminOperations.delivery.cutoff}<input type="time" value={snapshot.delivery.sameDayCutoff} onChange={(event) => setSnapshot({ ...snapshot, delivery: { ...snapshot.delivery, sameDayCutoff: event.target.value } })} /></label>}
        <label className="admin-field-span">{t.adminOperations.delivery.helpVi}<textarea rows={2} value={snapshot.delivery.deliveryHelpVi} onChange={(event) => setSnapshot({ ...snapshot, delivery: { ...snapshot.delivery, deliveryHelpVi: event.target.value } })} /></label>
        <label className="admin-field-span">{t.adminOperations.delivery.helpKo}<textarea rows={2} value={snapshot.delivery.deliveryHelpKo} onChange={(event) => setSnapshot({ ...snapshot, delivery: { ...snapshot.delivery, deliveryHelpKo: event.target.value } })} /></label>
      </div>
      {snapshot.delivery.pickupEnabled && <div className="admin-field-grid admin-operations-subsection">
        <h3 className="admin-field-span">{t.adminOperations.delivery.pickupDetails}</h3>
        {(["Vi", "Ko"] as const).map((locale) => <div className="admin-field-grid admin-field-span" key={locale}>
          <label>{t.adminOperations.delivery.pickupName} {locale.toUpperCase()}<input value={snapshot.delivery[`pickupName${locale}`]} onChange={(event) => setSnapshot({ ...snapshot, delivery: { ...snapshot.delivery, [`pickupName${locale}`]: event.target.value } })} /></label>
          <label>{t.adminOperations.delivery.pickupHours} {locale.toUpperCase()}<input value={snapshot.delivery[`pickupHours${locale}`]} onChange={(event) => setSnapshot({ ...snapshot, delivery: { ...snapshot.delivery, [`pickupHours${locale}`]: event.target.value } })} /></label>
          <label className="admin-field-span">{t.adminOperations.delivery.pickupAddress} {locale.toUpperCase()}<textarea rows={2} value={snapshot.delivery[`pickupAddress${locale}`]} onChange={(event) => setSnapshot({ ...snapshot, delivery: { ...snapshot.delivery, [`pickupAddress${locale}`]: event.target.value } })} /></label>
        </div>)}
      </div>}
      <button className="admin-button admin-button--primary" type="button" disabled={Boolean(busy)} onClick={() => saveIfValid("delivery", deliveryIssue(), () => repository.saveDelivery(snapshot.delivery))}>{busy === "delivery" ? t.adminOperations.saving : t.adminOperations.delivery.save}</button>
    </section>

    <section className="admin-editor-section admin-operations-section">
      <header><span>02</span><div><h2>{t.adminOperations.zones.title}</h2><p>{t.adminOperations.zones.intro}</p></div></header>
      <div className="admin-operations-list">
        {snapshot.zones.map((zone, index) => <details className="admin-operation-card" open={!zone.id} key={zone.id ?? `zone-${index}`}>
          <summary><div><strong>{zone.nameVi || t.adminOperations.zones.newZone}</strong><small>{zone.stableCode || t.adminOperations.zones.unsaved} · {formatVnd(zone.feeAmount)}</small></div><span>{zone.active ? t.adminOperations.active : t.adminOperations.inactive}</span></summary>
          <div className="admin-operation-card__body">
            <div className="admin-field-grid">
              <label>{t.adminOperations.code}<input value={zone.stableCode} onChange={(event) => updateZone(index, { ...zone, stableCode: event.target.value.toLowerCase().trim() })} /></label>
              <label>{t.adminOperations.zones.fee}<input type="number" min={0} step={1000} value={zone.feeAmount} onChange={(event) => updateZone(index, { ...zone, feeAmount: Number(event.target.value) })} /></label>
              <label>{t.adminOperations.sortOrder}<input type="number" min={0} step={1} value={zone.sortOrder} onChange={(event) => updateZone(index, { ...zone, sortOrder: Number(event.target.value) })} /></label>
              <label className="admin-check"><input type="checkbox" checked={zone.active} onChange={(event) => updateZone(index, { ...zone, active: event.target.checked })} /><span>{t.adminOperations.active}</span></label>
              <label className="admin-check"><input type="checkbox" checked={zone.sameDayEligible} onChange={(event) => updateZone(index, { ...zone, sameDayEligible: event.target.checked })} /><span>{t.adminOperations.sameDayEligible}</span></label>
              <label>{t.adminOperations.nameVi}<input value={zone.nameVi} onChange={(event) => updateZone(index, { ...zone, nameVi: event.target.value })} /></label>
              <label>{t.adminOperations.nameKo}<input value={zone.nameKo} onChange={(event) => updateZone(index, { ...zone, nameKo: event.target.value })} /></label>
              <label className="admin-field-span">{t.adminOperations.helpVi}<textarea rows={2} value={zone.helpVi} onChange={(event) => updateZone(index, { ...zone, helpVi: event.target.value })} /></label>
              <label className="admin-field-span">{t.adminOperations.helpKo}<textarea rows={2} value={zone.helpKo} onChange={(event) => updateZone(index, { ...zone, helpKo: event.target.value })} /></label>
            </div>
            <div className="admin-operation-areas"><div className="admin-operation-areas__heading"><h3>{t.adminOperations.areas.title}</h3><button className="admin-button admin-button--secondary" type="button" onClick={() => updateZone(index, { ...zone, areas: [...zone.areas, { ...emptyDeliveryArea(), sortOrder: zone.areas.length }] })}>{t.adminOperations.areas.add}</button></div>
              {zone.areas.length === 0 ? <p className="admin-inline-empty">{t.adminOperations.areas.empty}</p> : zone.areas.map((area, areaIndex) => <div className="admin-area-row" key={area.id ?? `area-${areaIndex}`}>
                <label>{t.adminOperations.code}<input value={area.stableCode} onChange={(event) => updateZone(index, { ...zone, areas: zone.areas.map((item, itemIndex) => itemIndex === areaIndex ? { ...item, stableCode: event.target.value.toLowerCase().trim() } : item) })} /></label>
                <label>{t.adminOperations.nameVi}<input value={area.nameVi} onChange={(event) => updateZone(index, { ...zone, areas: zone.areas.map((item, itemIndex) => itemIndex === areaIndex ? { ...item, nameVi: event.target.value } : item) })} /></label>
                <label>{t.adminOperations.nameKo}<input value={area.nameKo} onChange={(event) => updateZone(index, { ...zone, areas: zone.areas.map((item, itemIndex) => itemIndex === areaIndex ? { ...item, nameKo: event.target.value } : item) })} /></label>
                <label>{t.adminOperations.sortOrder}<input type="number" min={0} value={area.sortOrder} onChange={(event) => updateZone(index, { ...zone, areas: zone.areas.map((item, itemIndex) => itemIndex === areaIndex ? { ...item, sortOrder: Number(event.target.value) } : item) })} /></label>
                <label className="admin-check"><input type="checkbox" checked={area.active} onChange={(event) => updateZone(index, { ...zone, areas: zone.areas.map((item, itemIndex) => itemIndex === areaIndex ? { ...item, active: event.target.checked } : item) })} /><span>{t.adminOperations.active}</span></label>
                <button className="admin-button admin-button--secondary" type="button" onClick={() => removeArea(index, zone, areaIndex)}>{t.adminOperations.areas.remove}</button>
              </div>)}
            </div>
            <button className="admin-button admin-button--primary" type="button" disabled={Boolean(busy)} onClick={() => saveIfValid(`zone-${index}`, zoneIssue(zone), () => repository.saveZone(zone))}>{busy === `zone-${index}` ? t.adminOperations.saving : t.adminOperations.zones.save}</button>
          </div>
        </details>)}
      </div>
      <button className="admin-button admin-button--secondary" type="button" onClick={() => setSnapshot({ ...snapshot, zones: [...snapshot.zones, emptyDeliveryZone()] })}>{t.adminOperations.zones.add}</button>
    </section>

    <section className="admin-editor-section admin-operations-section">
      <header><span>03</span><div><h2>{t.adminOperations.windows.title}</h2><p>{t.adminOperations.windows.intro}</p></div></header>
      <div className="admin-operations-list">{snapshot.windows.map((window, index) => <div className="admin-operation-card admin-operation-card--flat" key={window.id ?? `window-${index}`}>
        <div className="admin-field-grid">
          <label>{t.adminOperations.code}<input value={window.stableCode} onChange={(event) => updateWindow(index, { ...window, stableCode: event.target.value.toLowerCase().trim() })} /></label>
          <label>{t.adminOperations.nameVi}<input value={window.labelVi} onChange={(event) => updateWindow(index, { ...window, labelVi: event.target.value })} /></label>
          <label>{t.adminOperations.nameKo}<input value={window.labelKo} onChange={(event) => updateWindow(index, { ...window, labelKo: event.target.value })} /></label>
          <label>{t.adminOperations.windows.start}<input type="time" value={window.startTime} onChange={(event) => updateWindow(index, { ...window, startTime: event.target.value })} /></label>
          <label>{t.adminOperations.windows.end}<input type="time" value={window.endTime} onChange={(event) => updateWindow(index, { ...window, endTime: event.target.value })} /></label>
          <label>{t.adminOperations.sortOrder}<input type="number" min={0} value={window.sortOrder} onChange={(event) => updateWindow(index, { ...window, sortOrder: Number(event.target.value) })} /></label>
          <label className="admin-field-span">{t.adminOperations.helpVi}<textarea rows={2} value={window.helpVi} onChange={(event) => updateWindow(index, { ...window, helpVi: event.target.value })} /></label>
          <label className="admin-field-span">{t.adminOperations.helpKo}<textarea rows={2} value={window.helpKo} onChange={(event) => updateWindow(index, { ...window, helpKo: event.target.value })} /></label>
          <label className="admin-check"><input type="checkbox" checked={window.active} onChange={(event) => updateWindow(index, { ...window, active: event.target.checked })} /><span>{t.adminOperations.active}</span></label>
          <label className="admin-check"><input type="checkbox" checked={window.sameDayEligible} onChange={(event) => updateWindow(index, { ...window, sameDayEligible: event.target.checked })} /><span>{t.adminOperations.sameDayEligible}</span></label>
        </div>
        <button className="admin-button admin-button--primary" type="button" disabled={Boolean(busy)} onClick={() => saveIfValid(`window-${index}`, windowIssue(window), () => repository.saveWindow(window))}>{busy === `window-${index}` ? t.adminOperations.saving : t.adminOperations.windows.save}</button>
      </div>)}</div>
      <button className="admin-button admin-button--secondary" type="button" onClick={() => setSnapshot({ ...snapshot, windows: [...snapshot.windows, emptyDeliveryWindow()] })}>{t.adminOperations.windows.add}</button>
    </section>

    <section className="admin-editor-section admin-operations-section">
      <header><span>04</span><div><h2>{t.adminOperations.payment.title}</h2><p>{t.adminOperations.payment.intro}</p></div></header>
      <div className="admin-field-grid">
        <label className="admin-check"><input type="checkbox" checked={snapshot.payment.bankTransferEnabled} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, bankTransferEnabled: event.target.checked } })} /><span><strong>{t.adminOperations.payment.bankTransfer}</strong><small>{t.adminOperations.payment.bankTransferHelp}</small></span></label>
        <label className="admin-check"><input type="checkbox" checked={snapshot.payment.cashEnabled} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, cashEnabled: event.target.checked } })} /><span><strong>{t.adminOperations.payment.cash}</strong></span></label>
        {snapshot.payment.bankTransferEnabled && <>
          <label>{t.adminOperations.payment.bankId}<input value={snapshot.payment.bankId} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, bankId: event.target.value } })} /></label>
          <label>{t.adminOperations.payment.bankName}<input value={snapshot.payment.bankName} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, bankName: event.target.value } })} /></label>
          <label>{t.adminOperations.payment.accountNumber}<input value={snapshot.payment.accountNumber} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, accountNumber: event.target.value } })} /></label>
          <label>{t.adminOperations.payment.accountHolder}<input value={snapshot.payment.accountHolder} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, accountHolder: event.target.value } })} /></label>
          <label>{t.adminOperations.payment.vietqrTemplate}<input value={snapshot.payment.vietqrTemplate} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, vietqrTemplate: event.target.value } })} /></label>
          <label>{t.adminOperations.payment.referenceTemplate}<input value={snapshot.payment.transferReferenceTemplate} placeholder="LUMEA {order_number}" onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, transferReferenceTemplate: event.target.value } })} /><small>{t.adminOperations.payment.referenceHelp}</small></label>
          <label>{t.adminOperations.payment.deadline}<input type="number" min={1} max={720} value={snapshot.payment.paymentDeadlineHours ?? ""} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, paymentDeadlineHours: event.target.value ? Number(event.target.value) : null } })} /></label>
          <label className="admin-field-span">{t.adminOperations.payment.bankInstructionsVi}<textarea rows={3} value={snapshot.payment.bankInstructionsVi} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, bankInstructionsVi: event.target.value } })} /></label>
          <label className="admin-field-span">{t.adminOperations.payment.bankInstructionsKo}<textarea rows={3} value={snapshot.payment.bankInstructionsKo} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, bankInstructionsKo: event.target.value } })} /></label>
        </>}
        {snapshot.payment.cashEnabled && <>
          <label className="admin-check"><input type="checkbox" checked={snapshot.payment.cashDeliveryEnabled} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, cashDeliveryEnabled: event.target.checked } })} /><span>{t.adminOperations.payment.cashDelivery}</span></label>
          <label className="admin-check"><input type="checkbox" checked={snapshot.payment.cashPickupEnabled} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, cashPickupEnabled: event.target.checked } })} /><span>{t.adminOperations.payment.cashPickup}</span></label>
          <label className="admin-field-span">{t.adminOperations.payment.cashInstructionsVi}<textarea rows={3} value={snapshot.payment.cashInstructionsVi} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, cashInstructionsVi: event.target.value } })} /></label>
          <label className="admin-field-span">{t.adminOperations.payment.cashInstructionsKo}<textarea rows={3} value={snapshot.payment.cashInstructionsKo} onChange={(event) => setSnapshot({ ...snapshot, payment: { ...snapshot.payment, cashInstructionsKo: event.target.value } })} /></label>
        </>}
      </div>
      <button className="admin-button admin-button--primary" type="button" disabled={Boolean(busy)} onClick={() => saveIfValid("payment", paymentIssue(), () => repository.savePayment(snapshot.payment))}>{busy === "payment" ? t.adminOperations.saving : t.adminOperations.payment.save}</button>
    </section>
  </section>;
}
