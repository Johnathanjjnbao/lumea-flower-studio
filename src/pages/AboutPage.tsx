import { Link } from "react-router-dom";
import { ManagedImage } from "../components/ManagedImage";
import { PageFrame } from "../components/PageFrame";
import { useHomepageContent } from "../features/homepage/useHomepageContent";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useI18n } from "../i18n";

export function AboutPage() {
  const { locale, path, t } = useI18n();
  const homepage = useHomepageContent(locale);
  const story = homepage.status === "success" ? homepage.data.sections.why_lumea : null;
  useDocumentMetadata(t.meta.aboutTitle, t.meta.aboutDescription);

  return <PageFrame><div className="editorial-page section-shell section-space">
    <header className="editorial-heading">
      <p className="eyebrow">{t.aboutPage.eyebrow}</p>
      <h1>{story ? <>{story.copy.titleOne} {story.copy.titleTwo}</> : t.aboutPage.title}</h1>
      {story?.copy.body && <p>{story.copy.body}</p>}
    </header>
    {homepage.status === "loading" ? <p aria-busy="true">{t.aboutPage.loading}</p>
      : homepage.status === "error" ? <div className="editorial-empty" role="alert"><p>{t.aboutPage.error}</p><button className="button button--outline" type="button" onClick={homepage.retry}>{t.catalog.retry}</button></div>
      : story ? <div className="editorial-stories">{story.features.map((feature) => <article className="editorial-story" key={feature.id}>
        {feature.media && <div className="editorial-story__image"><ManagedImage src={feature.media.url} alt={feature.media.altText} loading="lazy" /></div>}
        <div><span>{feature.label}</span><h2>{feature.title}</h2><p>{feature.body}</p></div>
      </article>)}</div>
      : <div className="editorial-empty"><p>{t.aboutPage.empty}</p></div>}
    <nav className="editorial-actions" aria-label={t.aboutPage.nextSteps}>
      <Link className="button button--solid" to={path("/flowers")}>{t.aboutPage.shop}</Link>
      <Link className="text-link" to={path("/contact")}>{t.aboutPage.contact}</Link>
    </nav>
  </div></PageFrame>;
}
