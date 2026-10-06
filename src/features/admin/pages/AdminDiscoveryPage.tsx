import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../../i18n";
import { invalidateDiscoveryOptions } from "../../discovery/storefrontDiscovery";
import { AdminDiscoveryError, createAdminDiscoveryRepository, type AdminDiscoveryItem, type AdminDiscoverySnapshot } from "../discovery/repository";

export function AdminDiscoveryPage() {
  const { t } = useI18n();
  const copy = t.adminDiscovery;
  const repository = useMemo(() => createAdminDiscoveryRepository(), []);
  const [snapshot, setSnapshot] = useState<AdminDiscoverySnapshot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    document.title = `${copy.title} — Luméa Admin`;
    let active = true;
    void repository.getSnapshot().then((value) => { if (active) setSnapshot(value); }, () => { if (active) setNotice({ tone: "error", text: copy.loadError }); });
    return () => { active = false; };
  }, [copy.loadError, copy.title, repository]);

  const update = (kind: "occasions" | "budgets", next: AdminDiscoveryItem) => setSnapshot((current) => current ? { ...current, [kind]: current[kind].map((item) => item.id === next.id ? next : item) } : current);
  const save = async (kind: "occasions" | "budgets", item: AdminDiscoveryItem) => {
    setBusy(item.id); setNotice(null);
    try {
      if (kind === "occasions") await repository.saveOccasion(item); else await repository.saveBudget(item);
      invalidateDiscoveryOptions();
      setNotice({ tone: "success", text: copy.saved });
    } catch (error) {
      const code = error instanceof AdminDiscoveryError ? error.code : "FAILED";
      setNotice({ tone: "error", text: code === "FAILED" ? copy.saveError : copy.validation[code] });
    } finally { setBusy(null); }
  };

  if (!snapshot) return <section className="admin-page" aria-busy={!notice}><div className="admin-empty"><h2>{notice?.text ?? copy.loading}</h2></div></section>;

  const list = (kind: "occasions" | "budgets") => <div className="admin-operations-list">{snapshot[kind].map((item) => <article className="admin-operation-card" key={item.id}>
    <header><div><strong>{item.stableCode}</strong><small>{item.active ? copy.active : copy.hidden}</small></div><label className="admin-check admin-check--compact"><input type="checkbox" checked={item.active} onChange={(event) => update(kind, { ...item, active: event.target.checked })} /><span>{copy.visible}</span></label></header>
    <div className="admin-field-grid admin-field-grid--three">
      <label>{copy.sortOrder}<input type="number" min={0} step={1} value={item.sortOrder} onChange={(event) => update(kind, { ...item, sortOrder: Number(event.target.value) })} /></label>
      {kind === "budgets" && <><label>{copy.minAmount}<input type="number" min={0} step={1000} value={item.minAmount} onChange={(event) => update(kind, { ...item, minAmount: Number(event.target.value) })} /></label><label>{copy.maxAmount}<input type="number" min={0} step={1000} value={item.maxAmount ?? ""} onChange={(event) => update(kind, { ...item, maxAmount: event.target.value === "" ? null : Number(event.target.value) })} /><small>{copy.noMaximum}</small></label></>}
    </div>
    {(["vi", "ko"] as const).map((locale) => <fieldset key={locale}><legend>{locale.toUpperCase()}</legend><div className="admin-field-grid">{kind === "budgets" && <label>{copy.scale}<input value={item[locale].scale} onChange={(event) => update(kind, { ...item, [locale]: { ...item[locale], scale: event.target.value } })} /></label>}<label>{copy.label}<input value={item[locale].label} onChange={(event) => update(kind, { ...item, [locale]: { ...item[locale], label: event.target.value } })} /></label><label className="admin-field-span">{copy.description}<textarea rows={2} value={item[locale].description} onChange={(event) => update(kind, { ...item, [locale]: { ...item[locale], description: event.target.value } })} /></label></div></fieldset>)}
    <button className="admin-button admin-button--secondary" type="button" disabled={Boolean(busy)} onClick={() => void save(kind, item)}>{busy === item.id ? copy.saving : copy.save}</button>
  </article>)}</div>;

  return <section className="admin-page admin-discovery-page"><header className="admin-page-heading"><span className="admin-kicker">DISCOVERY</span><h1>{copy.title}</h1><p>{copy.intro}</p></header>{notice && <div className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</div>}<section className="admin-editor-section"><header><span>01</span><div><h2>{copy.occasions}</h2><p>{copy.occasionsHelp}</p></div></header>{list("occasions")}</section><section className="admin-editor-section"><header><span>02</span><div><h2>{copy.budgets}</h2><p>{copy.budgetsHelp}</p></div></header>{list("budgets")}</section></section>;
}
