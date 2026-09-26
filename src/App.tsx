import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { PrototypeActionProvider } from "./context/PrototypeActionContext";
import { CatalogPage } from "./pages/CatalogPage";
import { HomePage } from "./pages/HomePage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { I18nProvider } from "./i18n";

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
            <Route path="/ko" element={<HomePage />} />
            <Route path="/ko/flowers" element={<CatalogPage />} />
            <Route path="/ko/flowers/:slug" element={<ProductDetailPage />} />
          </Routes>
        </PrototypeActionProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
