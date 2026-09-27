import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { PrototypeActionProvider } from "./context/PrototypeActionContext";
import { CatalogPage } from "./pages/CatalogPage";
import { BouquetBuilderPage } from "./pages/BouquetBuilderPage";
import { HomePage } from "./pages/HomePage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { I18nProvider } from "./i18n";

const AdminRoutes = lazy(() => import("./features/admin/AdminRoutes"));

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <BrowserRouter basename={basename}>
      <I18nProvider>
        <PrototypeActionProvider>
          <ScrollToTop />
          <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/flowers" element={<CatalogPage />} />
              <Route path="/flowers/:slug" element={<ProductDetailPage />} />
              <Route path="/create-bouquet" element={<BouquetBuilderPage />} />
              <Route path="/ko" element={<HomePage />} />
              <Route path="/ko/flowers" element={<CatalogPage />} />
              <Route path="/ko/flowers/:slug" element={<ProductDetailPage />} />
              <Route path="/ko/create-bouquet" element={<BouquetBuilderPage />} />
            <Route path="/admin/*" element={<Suspense fallback={<main className="admin-gate" aria-busy="true"><p>Đang tải khu vực quản trị…</p></main>}><AdminRoutes /></Suspense>} />
          </Routes>
        </PrototypeActionProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
