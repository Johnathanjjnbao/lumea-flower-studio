import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { invalidateCommercialContentCache } from "../../commercialContent/storefrontCommercialContent";
import type { CommercialContentCopy, CommercialContentSection } from "../../commercialContent/types";
import { createAdminCommercialContentRepository } from "../../commercialContent/repository";
import { useI18n } from "../../../i18n";

function isComplete(copy: CommercialContentCopy) {
  return Boolean(copy.title.trim() && copy.summary.trim() && copy.body.trim());
}

function PolicyEditor({ section, onSaved }: { section: CommercialContentSection; onSaved: () => Promise<void> }) {
  const { t } = useI18n();
  const copy = t.adminCommercialPolicies;
  const repository = useMemo(() => createAdminCommercialContentRepository(), []);
  const [draft, setDraft] = useState(section);
  const [locale, setLocale] = useState<"vi" | "ko">("vi");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => setDraft(section), [section]);

  const localized = draft[locale];
  const update = (field: keyof CommercialContentCopy, value: string) => {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));
    setNotice(null);
  };

  async function save(visibility: "DRAFT" | "PUBLISHED") {
    if (visibility === "PUBLISHED" && (!isComplete(draft.vi) || !isComplete(draft.ko))) {
      setNotice({ tone: "error", text: copy.validationTitle });
      return;
    }
    if (visibility === "PUBLISHED" && !window.confirm(copy.publishConfirm)) return;
    setSaving(true);
    setNotice(null);
    try {
      await repository.save(draft, visibility);
      invalidateCommercialContentCache();
      await onSaved();
      setNotice({ tone: "success", text: visibility === "PUBLISHED" ? copy.published : copy.savedDraft });
    } catch {
      setNotice({ tone: "error", text: copy.saveError });
    } finally {
      setSaving(false);
    }
  }

  const label = copy.labels[section.code];
  const panelId = `policy-${section.code.toLowerCase()}-${locale}`;
  return <details className="admin-policy-card" open={section.sortOrder === 10}>
    <summary>
      <span><strong>{label}</strong><small>{section.code}</small></span>
      <span className={`admin-status admin-status--${section.visibility.toLowerCase()}`}>{section.visibility === "PUBLISHED" ? copy.statusPublished : copy.statusDraft}</span>
      <span className="admin-policy-completion">VI {isComplete(draft.vi) ? "✓" : "—"} · KO {isComplete(draft.ko) ? "✓" : "—"}</span>
    </summary>
    <div className="admin-policy-editor">
      {notice && <p className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
      <div className="admin-tabs" role="tablist" aria-label={copy.completion}>
        <button type="button" role="tab" aria-selected={locale === "vi"} aria-controls={panelId} onClick={() => setLocale("vi")}>{copy.vi} {isComplete(draft.vi) ? "✓" : ""}</button>
        <button type="button" role="tab" aria-selected={locale === "ko"} aria-controls={panelId} onClick={() => setLocale("ko")}>{copy.ko} {isComplete(draft.ko) ? "✓" : ""}</button>
      </div>
      <div id={panelId} role="tabpanel" className="admin-policy-layout">
        <div className="admin-field-grid">
          <label className="admin-field-span">{copy.titleLabel}<input maxLength={160} value={localized.title} onChange={(event) => update("title", event.target.value)} /></label>
          <label className="admin-field-span">{copy.summaryLabel}<textarea rows={3} maxLength={600} value={localized.summary} onChange={(event) => update("summary", event.target.value)} /></label>
          <label className="admin-field-span">{copy.bodyLabel}<textarea rows={10} maxLength={12000} value={localized.body} onChange={(event) => update("body", event.target.value)} /></label>
        </div>
        <section className="admin-policy-preview" aria-label={copy.preview}>
          <span className="admin-kicker">{copy.preview} · {locale.toUpperCase()}</span>
          {isComplete(localized) ? <><h3>{localized.title}</h3><p>{localized.summary}</p><div>{localized.body}</div></> : <p>{copy.previewEmpty}</p>}
        </section>
      </div>
      <div className="admin-policy-actions">
        <button className="admin-button admin-button--secondary" type="button" disabled={saving} onClick={() => void save("DRAFT")}>{copy.saveDraft}</button>
        <button className="admin-button admin-button--primary" type="button" disabled={saving} onClick={() => void save("PUBLISHED")}>{section.visibility === "PUBLISHED" ? copy.updatePublished : copy.publish}</button>
      </div>
    </div>
  </details>;
}

export function AdminCommercialPoliciesPage() {
  const { path, t } = useI18n();
  const copy = t.adminCommercialPolicies;
  const repository = useMemo(() => createAdminCommercialContentRepository(), []);
  const [sections, setSections] = useState<CommercialContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false);
    try { setSections(await repository.listAll()); }
    catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    document.title = `${copy.title} — Luméa Admin`;
    void load();
  // Repository is stable for this page lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy.title, repository]);

  if (loading) return <section className="admin-page"><div className="admin-empty" aria-busy="true">{copy.loading}</div></section>;
  if (error) return <section className="admin-page"><div className="admin-empty"><h1>{copy.loadError}</h1><button className="admin-button admin-button--secondary" type="button" onClick={() => void load()}>{copy.retry}</button></div></section>;

  return <section className="admin-page admin-policies-page">
    <header className="admin-page-heading"><div><span className="admin-kicker">{copy.eyebrow}</span><h1>{copy.title}</h1></div><p>{copy.intro}</p></header>
    <aside className="admin-policy-context">
      <div><strong>{copy.contextTitle}</strong><p>{copy.contextIntro}</p></div>
      <div><Link to={path("/admin/operations")}>{copy.operationsLink}</Link><Link to={path("/admin/site-settings")}>{copy.siteProfileLink}</Link></div>
    </aside>
    <div className="admin-policy-list">{sections.map((section) => <PolicyEditor key={section.id} section={section} onSaved={load} />)}</div>
  </section>;
}
