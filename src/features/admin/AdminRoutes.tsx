import { Navigate, Route, Routes } from "react-router-dom";
import { useI18n } from "../../i18n";
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
import { AdminHomepagePage } from "./pages/AdminHomepagePage";
import { AdminForgotPasswordPage } from "./pages/AdminForgotPasswordPage";
import { AdminResetPasswordPage } from "./pages/AdminResetPasswordPage";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminOrderDetailPage } from "./pages/AdminOrderDetailPage";
import { AdminOperationsPage } from "./pages/AdminOperationsPage";
import { AdminSiteSettingsPage } from "./pages/AdminSiteSettingsPage";
import { AdminDiscoveryPage } from "./pages/AdminDiscoveryPage";
import { AdminCategoriesPage } from "./categories/AdminCategoriesPage";
import { AdminNavigationPage } from "./navigation/AdminNavigationPage";

export default function AdminRoutes() {
  const { path } = useI18n();
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route path="forgot-password" element={<AdminForgotPasswordPage />} />
        <Route path="reset-password" element={<AdminResetPasswordPage />} />
        <Route element={<AdminGuard><AdminShell /></AdminGuard>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="homepage" element={<AdminHomepagePage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="operations" element={<AdminOperationsPage />} />
          <Route path="site-settings" element={<AdminSiteSettingsPage />} />
          <Route path="discovery" element={<AdminDiscoveryPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductEditorPage />} />
          <Route path="products/:id" element={<AdminProductEditorPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="navigation" element={<AdminNavigationPage />} />
          <Route path="builder/flowers" element={<AdminBuilderFlowersPage />} />
          <Route path="builder/flowers/new" element={<AdminBuilderFlowerEditorPage />} />
          <Route path="builder/flowers/:id" element={<AdminBuilderFlowerEditorPage />} />
          <Route path="builder/wrappings" element={<AdminBuilderWrappingsPage />} />
          <Route path="builder/wrappings/new" element={<AdminBuilderWrappingEditorPage />} />
          <Route path="builder/wrappings/colors/new" element={<AdminBuilderColorEditorPage />} />
          <Route path="builder/wrappings/colors/:id" element={<AdminBuilderColorEditorPage />} />
          <Route path="builder/wrappings/:id" element={<AdminBuilderWrappingEditorPage />} />
        </Route>
        <Route path="*" element={<Navigate to={path("/admin")} replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}
