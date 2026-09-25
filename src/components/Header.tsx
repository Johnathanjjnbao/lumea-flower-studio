import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { siteConfig } from "../config/siteConfig";
import { usePrototypeAction } from "../context/PrototypeActionContext";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [activeSection, setActiveSection] = useState("top");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const quickNavButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const { showPrototypeAction } = usePrototypeAction();

  const isHome = location.pathname === "/";

  useEffect(() => {
    const updateHeaderState = () => setCompact(window.scrollY > 56);
    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
    return () => window.removeEventListener("scroll", updateHeaderState);
  }, []);

  useEffect(() => {
    if (!isHome) return;
    const sections = siteConfig.homeChapters
      .map((chapter) => document.getElementById(chapter.id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;

    const intersections = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) intersections.add(entry.target.id);
          else intersections.delete(entry.target.id);
        });

        const activationLine = window.innerHeight * 0.24;
        const visible = sections
          .filter((section) => intersections.has(section.id))
          .sort((a, b) => (
            Math.abs(a.getBoundingClientRect().top - activationLine)
            - Math.abs(b.getBoundingClientRect().top - activationLine)
          ))[0];
        if (visible) setActiveSection(visible.id);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.01, 0.2] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome]);

  useEffect(() => {
    setMenuOpen(false);
    setQuickNavOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuOpen) {
        setMenuOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      } else if (quickNavOpen) {
        setQuickNavOpen(false);
        window.requestAnimationFrame(() => quickNavButtonRef.current?.focus());
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, quickNavOpen]);

  useEffect(() => {
    if (!quickNavOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setQuickNavOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [quickNavOpen]);

  const chapterIsActive = (id: string) => isHome && activeSection === id;
  const navigationIsActive = (to: string) => {
    if (to === "/flowers") return location.pathname.startsWith("/flowers");
    const id = to.split("#")[1];
    return Boolean(id && chapterIsActive(id));
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <div className="top-note" aria-label="Thông tin giao hoa">
        <span>Handcrafted daily in {siteConfig.city}</span>
        <span className="top-note__detail">Nhận giao trong ngày với mẫu hoa phù hợp</span>
      </div>
      <header ref={headerRef} className="site-header" data-header data-compact={compact}>
        <div className="header-inner">
          <button
            ref={menuButtonRef}
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Đóng mục khám phá" : "Mở mục khám phá"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-toggle__icon" aria-hidden="true"><i /><i /></span>
            <span className="menu-toggle__label">{menuOpen ? "Đóng" : "Khám phá"}</span>
          </button>

          <nav className="desktop-nav" aria-label="Điều hướng chính">
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                data-active={navigationIsActive(item.to)}
                aria-current={navigationIsActive(item.to) ? (item.to === "/flowers" ? "page" : "location") : undefined}
              >
                {item.label}
              </Link>
            ))}
            <button
              ref={quickNavButtonRef}
              className="quick-nav-trigger"
              type="button"
              aria-expanded={quickNavOpen}
              aria-controls="header-quick-nav"
              onClick={() => setQuickNavOpen((open) => !open)}
            >
              Khám phá <span aria-hidden="true">{quickNavOpen ? "−" : "+"}</span>
            </button>
          </nav>

          <Link className="wordmark" to="/#top" aria-label={`${siteConfig.brandDisplayName} Flower Studio, về đầu trang`}>
            <span className="wordmark__name">{siteConfig.brandName}</span>
            <span className="wordmark__descriptor">{siteConfig.descriptor} · {siteConfig.city}</span>
          </Link>

          <div className="header-actions">
            <button className="icon-button search-button" type="button" aria-label="Tìm kiếm" onClick={() => showPrototypeAction("Tìm kiếm")}>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="10.8" cy="10.8" r="6.6" />
                <path d="m16 16 4.2 4.2" />
              </svg>
            </button>
            <button className="cart-button" type="button" aria-label="Giỏ hàng, 0 sản phẩm" onClick={() => showPrototypeAction("Giỏ hàng")}>
              <span>Giỏ hàng</span>
              <span className="cart-count" aria-label="0 sản phẩm">0</span>
            </button>
          </div>
        </div>

        <nav className="mobile-menu" id="mobile-menu" aria-label="Khám phá Luméa" hidden={!menuOpen}>
          <div className="mobile-menu__head">
            <p><span>Đi đến</span><strong>Khám phá Luméa</strong></p>
            <Link className="mobile-menu__catalog" to="/flowers" onClick={() => setMenuOpen(false)}>
              Xem tất cả hoa <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mobile-menu__chapters">
            {siteConfig.homeChapters.map((chapter, index) => (
              <Link
                key={chapter.id}
                to={`/#${chapter.id}`}
                data-active={chapterIsActive(chapter.id)}
                aria-current={chapterIsActive(chapter.id) ? "location" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>{chapter.label}
              </Link>
            ))}
          </div>
          <p className="mobile-menu__note">Hoa được làm thủ công mỗi ngày tại Sài Gòn.</p>
        </nav>

        <nav className="header-quick-nav" id="header-quick-nav" aria-label="Các chương trên trang chủ" hidden={!quickNavOpen}>
          <div className="header-quick-nav__inner">
            <div className="header-quick-nav__head">
              <div><span>Homepage index</span><strong>Khám phá Luméa</strong></div>
              <div>
                <Link to="/flowers" onClick={() => setQuickNavOpen(false)}>Xem tất cả hoa <span aria-hidden="true">→</span></Link>
                <button type="button" onClick={() => setQuickNavOpen(false)} aria-label="Đóng mục khám phá">×</button>
              </div>
            </div>
            <div className="header-quick-nav__grid">
              {siteConfig.homeChapters.map((chapter, index) => (
                <Link
                  key={chapter.id}
                  to={`/#${chapter.id}`}
                  data-active={chapterIsActive(chapter.id)}
                  aria-current={chapterIsActive(chapter.id) ? "location" : undefined}
                  onClick={() => setQuickNavOpen(false)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{chapter.label}</strong>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
