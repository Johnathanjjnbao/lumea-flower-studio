import { Link } from "react-router-dom";
import { siteConfig } from "../config/siteConfig";
import { useI18n } from "../i18n";

export function Footer() {
  const { t, path } = useI18n();
  return <footer className="site-footer"><div className="section-shell footer-grid">
    <div className="footer-brand"><div className="footer-brand-lockup"><p className="footer-brand-meta">{t.brand.descriptor} · {t.brand.city}</p><Link className="footer-wordmark" to={path("/#top")}>{siteConfig.brandName}</Link></div><div className="footer-brand-message"><p>{t.footer.taglineOne}<br />{t.footer.taglineTwo}</p><span>{t.footer.message}</span></div></div>
    <nav className="footer-nav" aria-label={t.footer.navAria}><p>{t.footer.explore}</p><Link to={path("/flowers")}>{t.footer.collection}</Link><Link to={path("/#occasions")}>{t.footer.occasions}</Link><Link to={path("/#florist-choice")}>{t.footer.florist}</Link><Link to={path("/create-bouquet")}>{t.footer.custom}</Link></nav>
    <div className="footer-contact"><p>{t.footer.contact}</p><a href={siteConfig.phoneHref}>{siteConfig.phoneDisplay}</a><a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a><Link to={path("/#gallery")}>Instagram</Link></div>
    <div className="footer-bottom"><span>© {siteConfig.year} {siteConfig.brandDisplayName} {t.brand.descriptor}</span><span>{t.footer.handcrafted}</span></div>
  </div></footer>;
}
