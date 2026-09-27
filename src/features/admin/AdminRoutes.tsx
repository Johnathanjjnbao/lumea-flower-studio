import { Navigate, Route, Routes } from "react-router-dom";
import { AdminAuthProvider } from "./auth/AdminAuthContext";
import { AdminGuard } from "./auth/AdminGuard";
import { AdminShell } from "./components/AdminShell";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminProductEditorPage } from "./pages/AdminProductEditorPage";
import { AdminProductsPage } from "./pages/AdminProductsPage";

export default function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route element={<AdminGuard><AdminShell /></AdminGuard>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductEditorPage />} />
          <Route path="products/:id" element={<AdminProductEditorPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}
