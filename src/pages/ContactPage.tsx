import { Link } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { useHomepageContent } from "../features/homepage/useHomepageContent";
import { isSafeGoogleMapsUrl } from "../features/homepage/visitLocation";
import { useSiteProfile } from "../features/siteSettings/useSiteProfile";
import { isSafeEmail, isSafeInstagramUrl, normalizePhoneHref } from "../features/siteSettings/validation";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useI18n } from "../i18n";

export function ContactPage() {
  const { locale, path, t } = useI18n();
  const profile = useSiteProfile();
  const homepage = useHomepageContent(locale);
  const visit = homepage.status === "success" ? homepage.data.sections.visit : null;
  const phone = profile ? normalizePhoneHref(profile.phone) : null;
  const email = profile && isSafeEmail(profile.email) ? profile.email.trim() : null;
  const instagram = profile && profile.instagramUrl && isSafeInstagramUrl(profile.instagramUrl) ? profile.instagramUrl.trim() : null;
  const directions = visit?.visit.googleMapsUrl && isSafeGoogleMapsUrl(visit.visit.googleMapsUrl) ? visit.visit.googleMapsUrl.trim() : null;
  const channelsAvailable = Boolean(phone || email || instagram);
  useDocumentMetadata(t.meta.contactTitle, t.meta.contactDescription);

  return <PageFrame><div className="editorial-page section-shell section-space">
    <header className="editorial-heading">
      <p className="eyebrow">{t.contactPage.eyebrow}</p>
      <h1>{t.contactPage.title}</h1>
      <p>{t.contactPage.intro}</p>
    </header>
    <div className="contact-layout">
      <section aria-labelledby="contact-channels-title">
        <h2 id="contact-channels-title">{t.contactPage.channels}</h2>
        {channelsAvailable ? <dl className="contact-details">
          {phone && <div><dt>{t.contactPage.phone}</dt><dd><a href={phone}>{profile?.phone}</a></dd></div>}
          {email && <div><dt>{t.contactPage.email}</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div>}
          {instagram && <div><dt>Instagram</dt><dd><a href={instagram} target="_blank" rel="noreferrer">{profile?.instagramHandle || t.contactPage.instagram}</a></dd></div>}
        </dl> : <p className="editorial-empty">{t.contactPage.noChannels}</p>}
      </section>
      <section aria-labelledby="contact-visit-title">
        <h2 id="contact-visit-title">{t.contactPage.visit}</h2>
        {visit ? <dl className="contact-details">
          {visit.copy.detailOneValue && <div><dt>{visit.copy.detailOneLabel}</dt><dd>{visit.copy.detailOneValue}</dd></div>}
          {visit.copy.detailTwoValue && <div><dt>{visit.copy.detailTwoLabel}</dt><dd>{visit.copy.detailTwoValue}</dd></div>}
          {directions && <div><dt>{t.contactPage.directions}</dt><dd><a href={directions} target="_blank" rel="noreferrer">{visit.copy.primaryCtaLabel || t.contactPage.openMap}</a></dd></div>}
        </dl> : <p className="editorial-empty">{t.contactPage.noVisit}</p>}
      </section>
    </div>
    <nav className="editorial-actions" aria-label={t.contactPage.nextSteps}>
      <Link className="button button--solid" to={path("/flowers")}>{t.contactPage.shop}</Link>
      <Link className="text-link" to={path("/policies")}>{t.footer.policies}</Link>
    </nav>
  </div></PageFrame>;
}
