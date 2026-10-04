import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../../../i18n";
import { useAdminAuth } from "../auth/AdminAuthContext";

export function AdminShell() {
  const auth = useAdminAuth();
  const { path, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="admin-app">
      <a className="skip-link" href="#admin-main">Bỏ qua điều hướng</a>
      <header className="admin-header">
        <Link className="admin-brand" to={path("/admin")} aria-label="Luméa Admin — Trang chính">
          <strong>LUMÉA</strong><span>FLOWER STUDIO · ADMIN</span>
        </Link>
        <button className="admin-menu-button" type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? "Đóng" : "Menu"}
        </button>
        <nav id="admin-navigation" className="admin-nav" data-open={menuOpen} aria-label="Điều hướng quản trị">
          <NavLink to={path("/admin")} end onClick={() => setMenuOpen(false)}>Tổng quan</NavLink>
          <NavLink to={path("/admin/homepage")} onClick={() => setMenuOpen(false)}>Homepage</NavLink>
          <NavLink to={path("/admin/orders")} onClick={() => setMenuOpen(false)}>{t.adminOrders.nav}</NavLink>
          <NavLink to={path("/admin/products")} onClick={() => setMenuOpen(false)}>Sản phẩm</NavLink>
          <NavLink to={path("/admin/builder/flowers")} onClick={() => setMenuOpen(false)}>Hoa Builder</NavLink>
          <NavLink to={path("/admin/builder/wrappings")} onClick={() => setMenuOpen(false)}>Giấy gói</NavLink>
          <Link to={path("/")} target="_blank" rel="noreferrer">Xem website ↗</Link>
          <button className="admin-nav__signout" type="button" onClick={() => void auth.signOut()}>Đăng xuất</button>
        </nav>
        <div className="admin-identity">
          <span>{auth.profile?.displayName || auth.email}</span>
          <small>{auth.profile?.role}</small>
          <button type="button" onClick={() => void auth.signOut()}>Đăng xuất</button>
        </div>
      </header>
      <main id="admin-main" className="admin-main"><Outlet /></main>
    </div>
  );
}
