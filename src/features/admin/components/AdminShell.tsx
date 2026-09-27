import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAdminAuth } from "../auth/AdminAuthContext";

export function AdminShell() {
  const auth = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="admin-app">
      <a className="skip-link" href="#admin-main">Bỏ qua điều hướng</a>
      <header className="admin-header">
        <Link className="admin-brand" to="/admin" aria-label="Luméa Admin — Trang chính">
          <strong>LUMÉA</strong><span>FLOWER STUDIO · ADMIN</span>
        </Link>
        <button className="admin-menu-button" type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? "Đóng" : "Menu"}
        </button>
        <nav id="admin-navigation" className="admin-nav" data-open={menuOpen} aria-label="Điều hướng quản trị">
          <NavLink to="/admin" end onClick={() => setMenuOpen(false)}>Tổng quan</NavLink>
          <NavLink to="/admin/products" onClick={() => setMenuOpen(false)}>Sản phẩm</NavLink>
          <NavLink to="/admin/builder/flowers" onClick={() => setMenuOpen(false)}>Hoa Builder</NavLink>
          <NavLink to="/admin/builder/wrappings" onClick={() => setMenuOpen(false)}>Giấy gói</NavLink>
          <a href={`${import.meta.env.BASE_URL}`} target="_blank" rel="noreferrer">Xem website ↗</a>
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
