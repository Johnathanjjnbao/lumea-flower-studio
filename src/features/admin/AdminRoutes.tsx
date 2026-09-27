import { Navigate, Route, Routes } from "react-router-dom";
import { AdminAuthProvider } from "./auth/AdminAuthContext";
import { AdminGuard } from "./auth/AdminGuard";
import { AdminShell } from "./components/AdminShell";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminProductEditorPage } from "./pages/AdminProductEditorPage";
import { AdminProductsPage } from "./pages/AdminProductsPage";
import { AdminBuilderColorEditorPage } from "./pages/AdminBuilderColorEditorPage";
import { AdminBuilderFlowerEditorPage } from "./pages/AdminBuilderFlowerEditorPage";
import { AdminBuilderFlowersPage } from "./pages/AdminBuilderFlowersPage";
import { AdminBuilderWrappingEditorPage } from "./pages/AdminBuilderWrappingEditorPage";
import { AdminBuilderWrappingsPage } from "./pages/AdminBuilderWrappingsPage";

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
          <Route path="builder/flowers" element={<AdminBuilderFlowersPage />} />
          <Route path="builder/flowers/new" element={<AdminBuilderFlowerEditorPage />} />
          <Route path="builder/flowers/:id" element={<AdminBuilderFlowerEditorPage />} />
          <Route path="builder/wrappings" element={<AdminBuilderWrappingsPage />} />
          <Route path="builder/wrappings/new" element={<AdminBuilderWrappingEditorPage />} />
          <Route path="builder/wrappings/colors/new" element={<AdminBuilderColorEditorPage />} />
          <Route path="builder/wrappings/colors/:id" element={<AdminBuilderColorEditorPage />} />
          <Route path="builder/wrappings/:id" element={<AdminBuilderWrappingEditorPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}
