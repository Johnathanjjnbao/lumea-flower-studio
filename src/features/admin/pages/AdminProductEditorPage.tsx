import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProductDetailsForm } from "../components/ProductDetailsForm";
import { ProductMediaPanel } from "../components/ProductMediaPanel";
import { createAdminCatalogRepository } from "../data/adminCatalogRepository";
import { validateProductDraft, validateProductForPublish, type ValidationIssue } from "../productValidation";
import { emptyAdminProduct, type AdminProductDraft, type AdminTaxonomy } from "../types";

type Notice = { message: string; tone: "success" | "error" } | null;

export function AdminProductEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const repository = useMemo(() => createAdminCatalogRepository(), []);
  const [product, setProduct] = useState<AdminProductDraft>(() => emptyAdminProduct());
  const [taxonomy, setTaxonomy] = useState<AdminTaxonomy>({ occasions: [], tones: [] });
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([repository.getTaxonomy(), id ? repository.getProduct(id) : Promise.resolve(null)])
      .then(([nextTaxonomy, loadedProduct]) => {
        if (cancelled) return;
        setTaxonomy(nextTaxonomy);
        if (id) {
          if (!loadedProduct) setNotice({ tone: "error", message: "Không tìm thấy sản phẩm này." });
          else setProduct(loadedProduct);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setNotice({ tone: "error", message: reason instanceof Error ? reason.message : "Không thể tải trình chỉnh sửa." });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, repository]);

  useEffect(() => {
    document.title = `${product.vi.name || "Sản phẩm mới"} — Luméa Admin`;
  }, [product.vi.name]);

  function showMessage(message: string, tone: "success" | "error") {
    setNotice({ message, tone });
  }

  async function saveDraft() {
    const nextIssues = validateProductDraft(product);
    setIssues(nextIssues);
    if (nextIssues.length) {
      setNotice({ tone: "error", message: "Hãy sửa các trường chưa hợp lệ trước khi lưu." });
      return null;
    }
    setBusy(true);
    setNotice(null);
    try {
      const saved = await repository.saveProduct(product);
      setProduct(saved);
      setNotice({ tone: "success", message: "Đã lưu bản nháp vào Supabase." });
      if (!id) navigate(`/admin/products/${saved.id}`, { replace: true });
      return saved;
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Không thể lưu sản phẩm." });
      return null;
    } finally { setBusy(false); }
  }

  async function publish() {
    const nextIssues = validateProductForPublish(product);
    setIssues(nextIssues);
    if (nextIssues.length) {
      setNotice({ tone: "error", message: "Sản phẩm chưa đủ điều kiện xuất bản." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const saved = await repository.saveProduct(product);
      if (!saved.id) throw new Error("Thiếu Product ID sau khi lưu.");
      await repository.setVisibility(saved.id, "PUBLISHED");
      const reloaded = await repository.getProduct(saved.id);
      if (reloaded) setProduct(reloaded);
      setNotice({ tone: "success", message: "Sản phẩm đã được xuất bản. Database xác nhận trạng thái PUBLISHED." });
      if (!id) navigate(`/admin/products/${saved.id}`, { replace: true });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Không thể xuất bản sản phẩm." });
    } finally { setBusy(false); }
  }

  async function changeVisibility(next: "HIDDEN" | "DRAFT") {
    if (!product.id) return;
    setBusy(true);
    try {
      await repository.setVisibility(product.id, next);
      const reloaded = await repository.getProduct(product.id);
      if (reloaded) setProduct(reloaded);
      setNotice({ tone: "success", message: next === "HIDDEN" ? "Sản phẩm đã được ẩn khỏi public read." : "Sản phẩm đã trở về bản nháp." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Không thể đổi trạng thái." });
    } finally { setBusy(false); }
  }

  async function archive() {
    if (!product.id || !window.confirm("Lưu trữ sản phẩm này? Sản phẩm sẽ không còn dùng cho lựa chọn mới và không bị xoá cứng.")) return;
    setBusy(true);
    try {
      await repository.setVisibility(product.id, "ARCHIVED");
      const reloaded = await repository.getProduct(product.id);
      if (reloaded) setProduct(reloaded);
      setNotice({ tone: "success", message: "Đã lưu trữ sản phẩm. Dữ liệu lịch sử vẫn được giữ." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Không thể lưu trữ sản phẩm." });
    } finally { setBusy(false); }
  }

  if (loading) return <section className="admin-page"><p className="admin-empty" aria-busy="true">Đang tải trình chỉnh sửa…</p></section>;
  const archived = product.visibility === "ARCHIVED";

  return (
    <section className="admin-page admin-editor-page">
      <header className="admin-editor-heading">
        <div><Link to="/admin/products">← Danh sách sản phẩm</Link><span className="admin-kicker">PRODUCT EDITOR</span><h1>{product.vi.name || "Sản phẩm mới"}</h1><p>{product.id ? `ID ${product.id}` : "Chưa được lưu vào database"}</p></div>
        <div className="admin-editor-heading__status"><span className={`admin-status admin-status--${product.visibility.toLowerCase()}`}>{product.visibility}</span>{product.updatedAt && <small>Cập nhật {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(product.updatedAt))}</small>}</div>
      </header>

      {notice && <p className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.message}</p>}
      {issues.length > 0 && <div className="admin-validation" role="alert"><strong>Cần kiểm tra:</strong><ul>{issues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}</li>)}</ul></div>}
      {archived && <p className="admin-alert">Sản phẩm đã lưu trữ và đang ở chế độ chỉ đọc trong Admin.</p>}

      <div className="admin-editor-layout">
        <div>
          <ProductDetailsForm product={product} taxonomy={taxonomy} onChange={setProduct} disabled={archived || busy} />
          <ProductMediaPanel product={product} repository={repository} disabled={archived || busy} onChange={(images) => setProduct((current) => ({ ...current, images }))} onMessage={showMessage} />
        </div>
        <aside className="admin-publish-panel" aria-label="Hành động xuất bản">
          <span className="admin-kicker">PUBLISHING</span>
          <h2>Trạng thái</h2>
          <p>Draft có thể chưa hoàn chỉnh. Publish yêu cầu tên VI/KO, biến thể hợp lệ và ảnh chính.</p>
          <dl><div><dt>VI</dt><dd>{product.vi.name.trim() ? "Đủ tên" : "Thiếu tên"}</dd></div><div><dt>KO</dt><dd>{product.ko.name.trim() ? "Đủ tên" : "Thiếu tên"}</dd></div><div><dt>Giá</dt><dd>{product.variants.some((variant) => variant.active && variant.priceAmount !== null) ? "Đã có" : "Chưa có"}</dd></div><div><dt>Ảnh chính</dt><dd>{product.images.some((image) => image.active && image.role === "PRIMARY") ? "Đã có" : "Chưa có"}</dd></div></dl>
          <button className="admin-button admin-button--secondary" type="button" disabled={busy || archived} onClick={() => void saveDraft()}>{busy ? "Đang xử lý…" : "Lưu bản nháp"}</button>
          <button className="admin-button admin-button--primary" type="button" disabled={busy || archived} onClick={() => void publish()}>Xuất bản</button>
          {product.visibility === "PUBLISHED" && <button className="admin-button admin-button--secondary" type="button" disabled={busy} onClick={() => void changeVisibility("HIDDEN")}>Ẩn khỏi website</button>}
          {product.visibility === "HIDDEN" && <button className="admin-button admin-button--secondary" type="button" disabled={busy} onClick={() => void changeVisibility("DRAFT")}>Chuyển về nháp</button>}
          {product.id && !archived && <button className="admin-danger-button" type="button" disabled={busy} onClick={() => void archive()}>Lưu trữ sản phẩm</button>}
        </aside>
      </div>
    </section>
  );
}
