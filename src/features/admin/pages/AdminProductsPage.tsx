import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminCatalogRepository } from "../data/adminCatalogRepository";
import type { AdminProductFilters, AdminProductListItem, AvailabilityStatus, ProductType, VisibilityStatus } from "../types";

const formatPrice = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

function priceSummary(product: AdminProductListItem) {
  if (product.minPrice === null) return "Chưa có giá";
  if (product.minPrice === product.maxPrice) return formatPrice.format(product.minPrice);
  return `${formatPrice.format(product.minPrice)} – ${formatPrice.format(product.maxPrice ?? product.minPrice)}`;
}

export function AdminProductsPage() {
  const repository = useMemo(() => createAdminCatalogRepository(), []);
  const [filters, setFilters] = useState<AdminProductFilters>({ visibility: "ALL", availability: "ALL", productType: "ALL" });
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Sản phẩm — Luméa Admin";
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    repository.listProducts(filters).then((rows) => {
      if (!cancelled) { setProducts(rows); setError(null); }
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "Không thể tải sản phẩm.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters, repository]);

  return (
    <section className="admin-page">
      <header className="admin-page-heading admin-page-heading--row">
        <div><span className="admin-kicker">CATALOG</span><h1>Sản phẩm</h1><p>Tối đa 200 sản phẩm cập nhật gần nhất.</p></div>
        <Link className="admin-button admin-button--primary" to="/admin/products/new">+ Tạo sản phẩm</Link>
      </header>
      <div className="admin-filters" aria-label="Bộ lọc sản phẩm">
        <label className="admin-search">Tìm kiếm<input type="search" placeholder="Tên hoặc slug" value={filters.search ?? ""} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /></label>
        <label>Hiển thị<select value={filters.visibility} onChange={(event) => setFilters((current) => ({ ...current, visibility: event.target.value as VisibilityStatus | "ALL" }))}><option value="ALL">Tất cả</option><option value="DRAFT">Nháp</option><option value="PUBLISHED">Đã xuất bản</option><option value="HIDDEN">Đang ẩn</option><option value="ARCHIVED">Lưu trữ</option></select></label>
        <label>Tình trạng<select value={filters.availability} onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value as AvailabilityStatus | "ALL" }))}><option value="ALL">Tất cả</option><option value="AVAILABLE">Có sẵn</option><option value="SEASONAL">Theo mùa</option><option value="UNAVAILABLE">Tạm hết</option></select></label>
        <label>Loại<select value={filters.productType} onChange={(event) => setFilters((current) => ({ ...current, productType: event.target.value as ProductType | "ALL" }))}><option value="ALL">Tất cả</option><option value="READY_MADE_BOUQUET">Bó hoa mẫu</option><option value="FLORIST_CHOICE">Florist's Choice</option><option value="CUSTOM_BOUQUET">Custom Bouquet</option></select></label>
      </div>
      {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}
      {loading ? <p className="admin-empty" aria-busy="true">Đang tải sản phẩm…</p> : products.length === 0 ? (
        <div className="admin-empty"><h2>Chưa có sản phẩm phù hợp.</h2><p>Thử bỏ bộ lọc hoặc bắt đầu với một bản nháp mới.</p><Link className="admin-button admin-button--secondary" to="/admin/products/new">Tạo sản phẩm đầu tiên</Link></div>
      ) : (
        <div className="admin-product-table-wrap"><table className="admin-product-table"><thead><tr><th>Sản phẩm</th><th>Trạng thái</th><th>Giá</th><th>Cập nhật</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{products.map((product) => (
          <tr key={product.id}>
            <td><div className="admin-product-cell">{product.thumbnailUrl ? <img src={product.thumbnailUrl} alt="" /> : <span className="admin-product-placeholder" aria-hidden="true">L</span>}<div><strong>{product.name}</strong><small>/{product.slug}</small><small>{product.categoryName} · {product.productType.replaceAll("_", " ")} {product.sameDayEligible ? "· Same-day" : ""}</small></div></div></td>
            <td><span className={`admin-status admin-status--${product.visibility.toLowerCase()}`}>{product.visibility}</span><small className="admin-table-secondary">{product.availability}</small></td>
            <td className="admin-price">{priceSummary(product)}</td>
            <td><time dateTime={product.updatedAt}>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(product.updatedAt))}</time></td>
            <td><Link className="admin-row-link" to={`/admin/products/${product.id}`} aria-label={`Sửa ${product.name}`}>Sửa →</Link></td>
          </tr>
        ))}</tbody></table></div>
      )}
    </section>
  );
}
