import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { PrototypeActionProvider } from "./context/PrototypeActionContext";
import { CatalogPage } from "./pages/CatalogPage";
import { HomePage } from "./pages/HomePage";
import { ProductDetailPage } from "./pages/ProductDetailPage";

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <BrowserRouter basename={basename}>
      <PrototypeActionProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/flowers" element={<CatalogPage />} />
          <Route path="/flowers/:slug" element={<ProductDetailPage />} />
        </Routes>
      </PrototypeActionProvider>
    </BrowserRouter>
  );
}
