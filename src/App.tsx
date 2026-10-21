import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { PrototypeActionProvider } from "./context/PrototypeActionContext";
import { CatalogPage } from "./pages/CatalogPage";
import { BouquetBuilderPage } from "./pages/BouquetBuilderPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { SameDayPage } from "./pages/SameDayPage";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { I18nProvider } from "./i18n";
import { CartProvider } from "./features/cart/CartContext";
import { reviewBuild, reviewMode } from "./review/mode";
import { ReviewAdminNotice } from "./review/ReviewAdminNotice";
import { ReviewNotFound } from "./review/ReviewNotFound";

const AdminRoutes = reviewBuild ? ReviewAdminNotice : lazy(() => import("./features/admin/AdminRoutes"));

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

  if (reviewBuild && !reviewMode) return <main role="alert" className="review-admin-notice section-shell section-space">
    <h1>Review demo unavailable on this address</h1>
    <p>This build cannot connect to the live shop. Open the approved preview URL.</p>
  </main>;

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
              <Route path="/policies" element={<PoliciesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/same-day" element={<SameDayPage />} />
              <Route path="/ko" element={<HomePage />} />
              <Route path="/ko/flowers" element={<CatalogPage />} />
              <Route path="/ko/flowers/:slug" element={<ProductDetailPage />} />
              <Route path="/ko/create-bouquet" element={<BouquetBuilderPage />} />
              <Route path="/ko/cart" element={<CartPage />} />
              <Route path="/ko/checkout" element={<CheckoutPage />} />
              <Route path="/ko/order-confirmation" element={<OrderConfirmationPage />} />
              <Route path="/ko/policies" element={<PoliciesPage />} />
              <Route path="/ko/about" element={<AboutPage />} />
              <Route path="/ko/contact" element={<ContactPage />} />
              <Route path="/ko/same-day" element={<SameDayPage />} />
            <Route path="/admin/*" element={<Suspense fallback={<main className="admin-gate" aria-busy="true"><p>Đang tải khu vực quản trị…</p></main>}><AdminRoutes /></Suspense>} />
            <Route path="/ko/admin/*" element={<Suspense fallback={<main className="admin-gate" aria-busy="true"><p>관리자 페이지를 불러오는 중…</p></main>}><AdminRoutes /></Suspense>} />
            {reviewBuild && <Route path="*" element={<ReviewNotFound />} />}
          </Routes>
          </PrototypeActionProvider>
        </CartProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
