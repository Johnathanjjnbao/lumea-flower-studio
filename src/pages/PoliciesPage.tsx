import { Link } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { useCommercialContent } from "../features/commercialContent/useCommercialContent";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useI18n } from "../i18n";

export const commercialContentAnchor = (code: string) => code.toLowerCase().replaceAll("_", "-");

export function PoliciesPage() {
  const { locale, path, t } = useI18n();
  const state = useCommercialContent(locale);
  useDocumentMetadata(t.meta.policiesTitle, t.meta.policiesDescription);

  if (state.status === "loading") return <PageFrame><div className="policies-page section-shell section-space" aria-busy="true"><p>{t.policies.loading}</p></div></PageFrame>;
  if (state.status === "error") return <PageFrame><div className="policies-page section-shell section-space"><div className="policy-empty" role="alert"><h1>{t.policies.errorTitle}</h1><p>{t.policies.errorText}</p><button className="button button--solid" type="button" onClick={state.retry}>{t.policies.retry}</button></div></div></PageFrame>;

  const sections = state.data.filter((section) => section.content !== null);
  return <PageFrame><div className="policies-page section-shell section-space">
    <header className="policies-heading"><p className="eyebrow"><span aria-hidden="true">V2.2</span>{t.policies.eyebrow}</p><h1>{t.policies.title}</h1><p>{t.policies.intro}</p></header>
    {sections.length ? <div className="policies-layout">
      <nav className="policies-index" aria-label={t.policies.title}>{sections.map((section) => <a href={`#${commercialContentAnchor(section.code)}`} key={section.code}>{section.content?.title}</a>)}</nav>
      <div className="policies-sections">{sections.map((section) => <section id={commercialContentAnchor(section.code)} key={section.code} tabIndex={-1}><h2>{section.content?.title}</h2><p className="policy-summary">{section.content?.summary}</p><div className="policy-body">{section.content?.body}</div></section>)}</div>
    </div> : <div className="policy-empty"><h2>{t.policies.emptyTitle}</h2><p>{t.policies.emptyText}</p><Link className="text-link" to={path("/")}>{t.policies.returnHome}</Link></div>}
  </div></PageFrame>;
}
