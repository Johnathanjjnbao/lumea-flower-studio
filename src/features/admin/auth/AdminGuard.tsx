import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";

export function AdminGuard({ children }: { children: ReactNode }) {
  const auth = useAdminAuth();
  const location = useLocation();
  if (auth.status === "loading") {
    return <main className="admin-gate" aria-busy="true"><p>Đang xác minh phiên quản trị…</p></main>;
  }
  if (auth.status === "signed-out") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  if (auth.status === "configuration-error" || auth.status === "unauthorized") {
    return (
      <main className="admin-gate">
        <span className="admin-kicker">LUMÉA · ADMIN</span>
        <h1>Không thể mở khu vực quản trị.</h1>
        <p>{auth.error}</p>
        {auth.status === "unauthorized" && <button className="admin-button admin-button--secondary" type="button" onClick={() => void auth.signOut()}>Đăng xuất</button>}
      </main>
    );
  }
  return children;
}
