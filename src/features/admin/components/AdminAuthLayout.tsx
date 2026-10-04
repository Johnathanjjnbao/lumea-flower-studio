import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { localizePath, useI18n } from "../../../i18n";

interface AdminAuthLayoutProps {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  showLanguageSwitcher?: boolean;
}

export function AdminAuthLayout({
  eyebrow,
  title,
  intro,
  children,
  showLanguageSwitcher = true,
}: AdminAuthLayoutProps) {
  const { locale, path, t } = useI18n();
  const location = useLocation();
  // Auth query/hash values may contain one-time credentials. Never copy them
  // into another link or locale URL.
  const currentTarget = location.pathname;

  return (
    <main className="admin-login">
      <section className="admin-login__brand" aria-label="Luméa Flower Studio">
        <span className="admin-kicker">PRIVATE ATELIER</span>
        <strong>LUMÉA</strong>
        <p>{t.adminAuth.brandNote}</p>
      </section>
      <section className="admin-login__panel">
        {showLanguageSwitcher && (
          <nav className="admin-auth-language" aria-label={t.adminAuth.languageAria}>
            <Link aria-current={locale === "vi" ? "page" : undefined} to={localizePath("vi", currentTarget)}>{t.adminAuth.switchToVi}</Link>
            <Link aria-current={locale === "ko" ? "page" : undefined} to={localizePath("ko", currentTarget)}>{t.adminAuth.switchToKo}</Link>
          </nav>
        )}
        <div>
          <span className="admin-kicker">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        {children}
        <Link className="admin-back-link" to={path("/")}>{t.adminAuth.backToSite}</Link>
      </section>
    </main>
  );
}
