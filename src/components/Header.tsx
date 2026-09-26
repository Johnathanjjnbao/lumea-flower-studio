import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { siteConfig } from "../config/siteConfig";
import { usePrototypeAction } from "../context/PrototypeActionContext";
import { localizePath, stripLocalePrefix, useI18n } from "../i18n";
import type { Locale } from "../types/content";

function LanguageSwitch({ variant }: { variant: "desktop" | "mobile" }) {
  const location = useLocation();
  const { locale, t } = useI18n();
  const target = (nextLocale: Locale) => localizePath(nextLocale, `${stripLocalePrefix(location.pathname)}${location.search}${location.hash}`);
  return (
    <nav className={`language-switch language-switch--${variant}`} aria-label="Language / 언어">
      <Link to={target("vi")} data-active={locale === "vi"} aria-current={locale === "vi" ? "page" : undefined} aria-label={t.header.switchToVi}>VI</Link>
      <span aria-hidden="true">/</span>
      <Link to={target("ko")} data-active={locale === "ko"} aria-current={locale === "ko" ? "page" : undefined} aria-label={t.header.switchToKo}>한국어</Link>
    </nav>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [activeSection, setActiveSection] = useState("top");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const quickNavButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const { t, path } = useI18n();
  const { showPrototypeAction } = usePrototypeAction();
  const appPathname = stripLocalePrefix(location.pathname);
  const isHome = appPathname === "/";

  useEffect(() => {
    const updateHeaderState = () => setCompact(window.scrollY > 56);
    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
    return () => window.removeEventListener("scroll", updateHeaderState);
  }, []);

  useEffect(() => {
    if (!isHome) return;
    const sections = siteConfig.homeChapters.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    const intersections = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? intersections.add(entry.target.id) : intersections.delete(entry.target.id));
      const activationLine = window.innerHeight * 0.24;
      const visible = sections.filter((section) => intersections.has(section.id)).sort((a, b) => Math.abs(a.getBoundingClientRect().top - activationLine) - Math.abs(b.getBoundingClientRect().top - activationLine))[0];
      if (visible) setActiveSection(visible.id);
    }, { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.01, 0.2] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome]);

  useEffect(() => { setMenuOpen(false); setQuickNavOpen(false); }, [location.pathname, location.hash]);
  useEffect(() => { document.body.classList.toggle("menu-open", menuOpen); return () => document.body.classList.remove("menu-open"); }, [menuOpen]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuOpen) { setMenuOpen(false); window.requestAnimationFrame(() => menuButtonRef.current?.focus()); }
      else if (quickNavOpen) { setQuickNavOpen(false); window.requestAnimationFrame(() => quickNavButtonRef.current?.focus()); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, quickNavOpen]);
  useEffect(() => {
    if (!quickNavOpen) return;
    const handlePointerDown = (event: PointerEvent) => { if (!headerRef.current?.contains(event.target as Node)) setQuickNavOpen(false); };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [quickNavOpen]);

  const chapterIsActive = (id: string) => isHome && activeSection === id;
  const navigationIsActive = (to: string) => to === "/flowers" ? appPathname.startsWith("/flowers") : Boolean(to.split("#")[1] && chapterIsActive(to.split("#")[1]));

  return <>
    <a className="skip-link" href="#main-content">{t.header.skip}</a>
    <div className="top-note" aria-label={t.header.deliveryAria}><span>{t.header.topNote}</span><span className="top-note__detail">{t.header.topNoteDetail}</span></div>
    <header ref={headerRef} className="site-header" data-header data-compact={compact}>
      <div className="header-inner">
        <button ref={menuButtonRef} className="menu-toggle" type="button" aria-label={menuOpen ? t.header.closeMenu : t.header.openMenu} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen((open) => !open)}><span className="menu-toggle__icon" aria-hidden="true"><i /><i /></span><span className="menu-toggle__label">{menuOpen ? t.header.closeLabel : t.header.openLabel}</span></button>
        <nav className="desktop-nav" aria-label={t.header.primaryNavAria}>
          {siteConfig.navigation.map((item) => <Link key={item.to} to={path(item.to)} data-active={navigationIsActive(item.to)} aria-current={navigationIsActive(item.to) ? (item.to === "/flowers" ? "page" : "location") : undefined}>{t.header.navigation[item.key]}</Link>)}
          <button ref={quickNavButtonRef} className="quick-nav-trigger" type="button" aria-expanded={quickNavOpen} aria-controls="header-quick-nav" onClick={() => setQuickNavOpen((open) => !open)}>{t.header.quickNav} <span aria-hidden="true">{quickNavOpen ? "−" : "+"}</span></button>
        </nav>
        <Link className="wordmark" to={path("/#top")} aria-label={t.header.homeAria}><span className="wordmark__name">{siteConfig.brandName}</span><span className="wordmark__descriptor">{t.brand.descriptor} · {t.brand.city}</span></Link>
        <div className="header-actions">
          <LanguageSwitch variant="desktop" />
          <button className="icon-button search-button" type="button" aria-label={t.header.search} onClick={() => showPrototypeAction(t.header.search)}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 4.2 4.2" /></svg></button>
          <button className="cart-button" type="button" aria-label={t.header.cartAria} onClick={() => showPrototypeAction(t.header.cart)}><span>{t.header.cart}</span><span className="cart-count" aria-label={t.header.zeroItems}>0</span></button>
        </div>
      </div>
      <nav className="mobile-menu" id="mobile-menu" aria-label={t.header.mobileNavAria} hidden={!menuOpen}>
        <div className="mobile-menu__head"><p><span>{t.header.goTo}</span><strong>{t.header.exploreLumea}</strong></p><Link className="mobile-menu__catalog" to={path("/flowers")} onClick={() => setMenuOpen(false)}>{t.header.viewAll} <span aria-hidden="true">→</span></Link></div>
        <LanguageSwitch variant="mobile" />
        <div className="mobile-menu__chapters">{siteConfig.homeChapters.map((id, index) => <Link key={id} to={path(`/#${id}`)} data-active={chapterIsActive(id)} aria-current={chapterIsActive(id) ? "location" : undefined} onClick={() => setMenuOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span>{t.header.chapters[id]}</Link>)}</div>
        <p className="mobile-menu__note">{t.header.mobileNote}</p>
      </nav>
      <nav className="header-quick-nav" id="header-quick-nav" aria-label={t.header.quickNavAria} hidden={!quickNavOpen}>
        <div className="header-quick-nav__inner"><div className="header-quick-nav__head"><div><span>{t.header.homeIndex}</span><strong>{t.header.exploreLumea}</strong></div><div><Link to={path("/flowers")} onClick={() => setQuickNavOpen(false)}>{t.header.viewAll} <span aria-hidden="true">→</span></Link><button type="button" onClick={() => setQuickNavOpen(false)} aria-label={t.header.closeQuickNav}>×</button></div></div>
          <div className="header-quick-nav__grid">{siteConfig.homeChapters.map((id, index) => <Link key={id} to={path(`/#${id}`)} data-active={chapterIsActive(id)} aria-current={chapterIsActive(id) ? "location" : undefined} onClick={() => setQuickNavOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{t.header.chapters[id]}</strong></Link>)}</div>
        </div>
      </nav>
    </header>
  </>;
}
