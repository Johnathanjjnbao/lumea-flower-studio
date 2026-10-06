import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../../../i18n";
import { createAdminSiteProfileRepository } from "../../siteSettings/repository";
import { emptySiteProfile, type SiteProfile } from "../../siteSettings/types";
import { invalidateSiteProfile } from "../../siteSettings/useSiteProfile";
import { validateSiteProfile } from "../../siteSettings/validation";

export function AdminSiteSettingsPage() {
  const { t } = useI18n();
  const copy = t.adminSiteSettings;
  const repository = useMemo(() => createAdminSiteProfileRepository(), []);
  const [profile, setProfile] = useState<SiteProfile>(emptySiteProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<ReturnType<typeof validateSiteProfile>>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${copy.title} — Luméa Admin`;
    let active = true;
    void repository.getProfile().then(
      (value) => { if (active) setProfile(value); },
      () => { if (active) setNotice({ tone: "error", text: copy.loadError }); },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [copy.loadError, copy.title, repository]);

  const update = (field: keyof SiteProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateSiteProfile(profile);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setNotice(null);
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await repository.saveProfile(profile);
      invalidateSiteProfile();
      setNotice({ tone: "success", text: copy.saved });
    } catch {
      setNotice({ tone: "error", text: copy.saveError });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="admin-page" aria-busy="true"><div className="admin-empty"><h2>{copy.loading}</h2></div></section>;

  const field = (name: keyof SiteProfile, label: string, type = "text", help?: string) => {
    const errorId = `site-${name}-error`;
    const error = errors[name] ? copy.validation[errors[name]] : null;
    return <label className={name === "businessName" || name === "instagramUrl" ? "admin-field-span" : undefined} htmlFor={`site-${name}`}>
      {label}
      <input id={`site-${name}`} type={type} value={profile[name]} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => update(name, event.target.value)} />
      {error ? <small className="admin-field-error" id={errorId}>{error}</small> : help ? <small>{help}</small> : null}
    </label>;
  };

  return <section className="admin-page admin-settings-page">
    <header className="admin-page-heading"><span className="admin-kicker">SITE PROFILE</span><h1>{copy.title}</h1><p>{copy.intro}</p></header>
    {Object.keys(errors).length > 0 && <div ref={errorSummaryRef} className="admin-alert admin-alert--error" role="alert" tabIndex={-1}><strong>{copy.validationTitle}</strong><ul>{Object.entries(errors).map(([name, code]) => <li key={name}><a href={`#site-${name}`}>{copy.validation[code]}</a></li>)}</ul></div>}
    {notice && <div className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</div>}
    <form className="admin-editor-section" onSubmit={submit} noValidate>
      <header><span>01</span><div><h2>{copy.identityTitle}</h2><p>{copy.identityHelp}</p></div></header>
      <div className="admin-field-grid">
        {field("businessName", copy.businessName)}
        {field("phone", copy.phone, "tel")}
        {field("email", copy.email, "email")}
      </div>
      <header><span>02</span><div><h2>{copy.socialTitle}</h2><p>{copy.socialHelp}</p></div></header>
      <div className="admin-field-grid">
        {field("instagramUrl", copy.instagramUrl, "url", copy.instagramUrlHelp)}
        {field("instagramHandle", copy.instagramHandle, "text", copy.instagramHandleHelp)}
      </div>
      <button className="admin-button admin-button--primary" type="submit" disabled={saving}>{saving ? copy.saving : copy.save}</button>
    </form>
  </section>;
}
