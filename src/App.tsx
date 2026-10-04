import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { PrototypeActionProvider } from "./context/PrototypeActionContext";
import { CatalogPage } from "./pages/CatalogPage";
import { BouquetBuilderPage } from "./pages/BouquetBuilderPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { I18nProvider } from "./i18n";
import { CartProvider } from "./features/cart/CartContext";

const AdminRoutes = lazy(() => import("./features/admin/AdminRoutes"));

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <BrowserRouter basename={basename}>
      <I18nProvider>
        <CartProvider>
          <PrototypeActionProvider>
          <ScrollToTop />
          <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/flowers" element={<CatalogPage />} />
              <Route path="/flowers/:slug" element={<ProductDetailPage />} />
              <Route path="/create-bouquet" element={<BouquetBuilderPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
              <Route path="/ko" element={<HomePage />} />
              <Route path="/ko/flowers" element={<CatalogPage />} />
              <Route path="/ko/flowers/:slug" element={<ProductDetailPage />} />
              <Route path="/ko/create-bouquet" element={<BouquetBuilderPage />} />
              <Route path="/ko/cart" element={<CartPage />} />
              <Route path="/ko/checkout" element={<CheckoutPage />} />
              <Route path="/ko/order-confirmation" element={<OrderConfirmationPage />} />
            <Route path="/admin/*" element={<Suspense fallback={<main className="admin-gate" aria-busy="true"><p>Đang tải khu vực quản trị…</p></main>}><AdminRoutes /></Suspense>} />
            <Route path="/ko/admin/*" element={<Suspense fallback={<main className="admin-gate" aria-busy="true"><p>관리자 페이지를 불러오는 중…</p></main>}><AdminRoutes /></Suspense>} />
          </Routes>
          </PrototypeActionProvider>
        </CartProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
