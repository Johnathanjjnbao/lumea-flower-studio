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
      <a className="skip-link" href="#admin-main">{t.adminShell.skipNavigation}</a>
      <header className="admin-header">
        <Link className="admin-brand" to={path("/admin")} aria-label={t.adminShell.homeAria}>
          <strong>LUMÉA</strong><span>FLOWER STUDIO · ADMIN</span>
        </Link>
        <button className="admin-menu-button" type="button" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? t.adminShell.closeMenu : t.adminShell.openMenu}
        </button>
        <nav id="admin-navigation" className="admin-nav" data-open={menuOpen} aria-label={t.adminShell.navigationAria}>
          <NavLink to={path("/admin")} end onClick={() => setMenuOpen(false)}>{t.adminShell.overview}</NavLink>
          <NavLink to={path("/admin/homepage")} onClick={() => setMenuOpen(false)}>{t.adminShell.homepage}</NavLink>
          <NavLink to={path("/admin/discovery")} onClick={() => setMenuOpen(false)}>{t.adminDiscovery.nav}</NavLink>
          <NavLink to={path("/admin/orders")} onClick={() => setMenuOpen(false)}>{t.adminOrders.nav}</NavLink>
          <NavLink to={path("/admin/operations")} onClick={() => setMenuOpen(false)}>{t.adminOperations.nav}</NavLink>
          <NavLink to={path("/admin/site-settings")} onClick={() => setMenuOpen(false)}>{t.adminSiteSettings.nav}</NavLink>
          <NavLink to={path("/admin/products")} onClick={() => setMenuOpen(false)}>{t.adminShell.products}</NavLink>
          <NavLink to={path("/admin/categories")} onClick={() => setMenuOpen(false)}>{t.adminShell.categories}</NavLink>
          <NavLink to={path("/admin/navigation")} onClick={() => setMenuOpen(false)}>{t.adminShell.navigation}</NavLink>
          <NavLink to={path("/admin/builder/flowers")} onClick={() => setMenuOpen(false)}>{t.adminShell.builderFlowers}</NavLink>
          <NavLink to={path("/admin/builder/wrappings")} onClick={() => setMenuOpen(false)}>{t.adminShell.wrappings}</NavLink>
          <Link to={path("/")} target="_blank" rel="noreferrer">{t.adminShell.viewSite}</Link>
          <button className="admin-nav__signout" type="button" onClick={() => void auth.signOut()}>{t.adminShell.signOut}</button>
        </nav>
        <div className="admin-identity">
          <span>{auth.profile?.displayName || auth.email}</span>
          <small>{auth.profile?.role}</small>
          <button type="button" onClick={() => void auth.signOut()}>{t.adminShell.signOut}</button>
        </div>
      </header>
      <main id="admin-main" className="admin-main"><Outlet /></main>
    </div>
  );
}
