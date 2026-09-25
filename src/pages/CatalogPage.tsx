import { useRef } from "react";
import { PageFrame } from "../components/PageFrame";
import { ProductCard } from "../components/ProductCard";
import { products } from "../data/content";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useImagePipeline } from "../hooks/useImagePipeline";

export function CatalogPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  useImagePipeline(pageRef, { observe: "images", prioritySelector: undefined, preloadMargin: "600px 0px" });
  useDocumentMetadata(
    "Bộ sưu tập hoa — Luméa Flower Studio",
    "Khám phá những thiết kế hoa thủ công hiện có tại Luméa Flower Studio.",
  );

  return (
    <PageFrame pageRef={pageRef}>
      <section className="catalog-page section-space" aria-labelledby="catalog-title">
        <div className="section-shell">
          <header className="catalog-heading">
            <div>
              <p className="eyebrow"><span aria-hidden="true">01</span>The collection</p>
              <h1 id="catalog-title">Hoa cho từng điều<br />bạn muốn gửi trao.</h1>
            </div>
            <div className="catalog-heading__meta">
              <p>Những thiết kế hiện có, được kết bằng tay theo sắc độ và vẻ đẹp tự nhiên của hoa trong ngày.</p>
              <p className="catalog-count">{products.length} thiết kế</p>
            </div>
          </header>
          <div className="product-grid catalog-grid">
            {products.map((product) => <ProductCard product={product} showAvailability showStartingPrice key={product.id} />)}
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
