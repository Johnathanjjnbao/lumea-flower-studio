import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { siteConfig } from "../config/siteConfig";
import { usePrototypeAction } from "../context/PrototypeActionContext";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { showPrototypeAction } = usePrototypeAction();

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !menuOpen) return;
      setMenuOpen(false);
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <>
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <div className="top-note" aria-label="Thông tin giao hoa">
        <span>Handcrafted daily in {siteConfig.city}</span>
        <span className="top-note__detail">Nhận giao trong ngày với mẫu hoa phù hợp</span>
      </div>
      <header className="site-header" data-header>
        <div className="header-inner">
          <button
            ref={menuButtonRef}
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>

          <nav className="desktop-nav" aria-label="Điều hướng chính">
            {siteConfig.navigation.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
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

        <nav className="mobile-menu" id="mobile-menu" aria-label="Menu di động" hidden={!menuOpen}>
          {siteConfig.navigation.map((item, index) => (
            <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
              {item.label} <span>{String(index + 1).padStart(2, "0")}</span>
            </Link>
          ))}
          <p>Hoa được làm thủ công mỗi ngày tại Sài Gòn.</p>
        </nav>
      </header>
    </>
  );
}
