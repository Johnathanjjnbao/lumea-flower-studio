import { Link } from "react-router-dom";
import { siteConfig } from "../config/siteConfig";
import { useSiteProfile } from "../features/siteSettings/useSiteProfile";
import { isSafeEmail, isSafeInstagramUrl, normalizePhoneHref } from "../features/siteSettings/validation";
import { useI18n } from "../i18n";

export function Footer() {
  const { t, path } = useI18n();
  const profile = useSiteProfile();
  const phoneHref = profile ? normalizePhoneHref(profile.phone) : null;
  const email = profile && isSafeEmail(profile.email) ? profile.email.trim() : null;
  const instagram = profile && profile.instagramUrl && isSafeInstagramUrl(profile.instagramUrl) ? profile.instagramUrl.trim() : null;
  return <footer className="site-footer"><div className="section-shell footer-grid">
    <div className="footer-brand"><div className="footer-brand-lockup"><p className="footer-brand-meta">{t.brand.descriptor} · {t.brand.city}</p><Link className="footer-wordmark" to={path("/#top")}>{siteConfig.brandName}</Link></div><div className="footer-brand-message"><p>{t.footer.taglineOne}<br />{t.footer.taglineTwo}</p><span>{t.footer.message}</span></div></div>
    <nav className="footer-nav" aria-label={t.footer.navAria}><p>{t.footer.explore}</p><Link to={path("/flowers")}>{t.footer.collection}</Link><Link to={path("/#occasions")}>{t.footer.occasions}</Link><Link to={path("/same-day")}>{t.footer.sameDay}</Link><Link to={path("/#florist-choice")}>{t.footer.florist}</Link><Link to={path("/about")}>{t.footer.about}</Link><Link to={path("/create-bouquet")}>{t.footer.custom}</Link><Link to={path("/policies")}>{t.footer.policies}</Link></nav>
    <div className="footer-contact"><p><Link to={path("/contact")}>{t.footer.contact}</Link></p>{phoneHref && <a href={phoneHref}>{profile?.phone}</a>}{email && <a href={`mailto:${email}`}>{email}</a>}{instagram && <a href={instagram} target="_blank" rel="noreferrer">Instagram</a>}</div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} {profile?.businessName || siteConfig.brandName} {t.brand.descriptor}</span><span>{t.footer.handcrafted}</span></div>
  </div></footer>;
}
