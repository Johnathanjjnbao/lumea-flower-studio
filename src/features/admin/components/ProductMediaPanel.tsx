import { useRef, useState, type ChangeEvent } from "react";
import type { AdminCatalogRepository } from "../data/adminCatalogRepository";
import type { AdminProductDraft, AdminProductImage } from "../types";

interface ProductMediaPanelProps {
  product: AdminProductDraft;
  repository: AdminCatalogRepository;
  disabled?: boolean;
  onChange: (images: AdminProductImage[]) => void;
  onMessage: (message: string, tone: "success" | "error") => void;
}

export function ProductMediaPanel({ product, repository, disabled, onChange, onMessage }: ProductMediaPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viAlt, setViAlt] = useState("");
  const [koAlt, setKoAlt] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const image = await repository.uploadProductImage(product, file, viAlt, koAlt);
      onChange([...product.images, image]);
      setViAlt("");
      setKoAlt("");
      if (inputRef.current) inputRef.current.value = "";
      onMessage("Ảnh đã được tải lên Storage và gắn vào sản phẩm.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Không thể tải ảnh.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function makePrimary(image: AdminProductImage) {
    if (!product.id) return;
    setBusy(true);
    try {
      await repository.setPrimaryImage(product.id, image.id);
      onChange(product.images.map((item) => ({ ...item, role: item.id === image.id ? "PRIMARY" : "GALLERY" as const })));
      onMessage("Đã đổi ảnh chính.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Không thể đổi ảnh chính.", "error");
    } finally { setBusy(false); }
  }

  async function remove(image: AdminProductImage) {
    if (!window.confirm("Gỡ ảnh này khỏi sản phẩm? File gốc sẽ được giữ để tránh mất dữ liệu ngoài ý muốn.")) return;
    setBusy(true);
    try {
      await repository.deactivateImage(image.id);
      onChange(product.images.filter((item) => item.id !== image.id));
      onMessage("Đã gỡ quan hệ ảnh; file gốc chưa bị xoá.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Không thể gỡ ảnh.", "error");
    } finally { setBusy(false); }
  }

  async function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= product.images.length) return;
    const reordered = [...product.images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusy(true);
    try {
      await repository.reorderImages(reordered);
      onChange(reordered.map((image, imageIndex) => ({ ...image, sortOrder: imageIndex })));
      onMessage("Đã lưu thứ tự gallery.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Không thể đổi thứ tự ảnh.", "error");
    } finally { setBusy(false); }
  }

  async function saveAlt(image: AdminProductImage) {
    setBusy(true);
    try {
      await repository.updateImageAlt(image.mediaAssetId, image.viAlt, image.koAlt);
      onMessage("Đã lưu alt text VI/KO.", "success");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Không thể lưu alt text.", "error");
    } finally { setBusy(false); }
  }

  return (
    <section className="admin-editor-section admin-media-section">
      <header><span>05</span><div><h2>Media gallery</h2><p>Ảnh lưu thật trong bucket public-media. Không dùng base64.</p></div></header>
      {!product.id ? (
        <div className="admin-inline-empty"><strong>Lưu bản nháp trước.</strong><p>Product ID là bắt buộc để tạo đường dẫn Storage an toàn.</p></div>
      ) : (
        <fieldset disabled={disabled || busy}>
          <div className="admin-upload-panel">
            <div className="admin-field-grid">
              <label>Alt text VI<input value={viAlt} onChange={(event) => setViAlt(event.target.value)} placeholder={product.vi.name || "Ảnh sản phẩm Luméa"} /></label>
              <label>Alt text KO<input value={koAlt} onChange={(event) => setKoAlt(event.target.value)} placeholder={product.ko.name || "Luméa 상품 이미지"} /></label>
            </div>
            <label className="admin-file-input">{busy ? "Đang xử lý…" : "+ Chọn ảnh để tải lên"}<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void upload(event)} /></label>
            <small>JPEG, PNG, WebP hoặc AVIF. Tên file được thay bằng UUID; giới hạn dung lượng sẽ được chốt theo policy owner.</small>
          </div>
          {product.images.length === 0 ? <p className="admin-inline-empty">Chưa có ảnh. Ảnh đầu tiên sẽ tự trở thành ảnh chính.</p> : (
            <div className="admin-media-grid">{product.images.map((image, index) => (
              <article className="admin-media-card" key={image.id}>
                <div className="admin-media-card__image"><img src={image.url} alt={image.viAlt} />{image.role === "PRIMARY" && <span>Ảnh chính</span>}</div>
                <div className="admin-media-card__body">
                  <label>Alt VI<input value={image.viAlt} onChange={(event) => onChange(product.images.map((item) => item.id === image.id ? { ...item, viAlt: event.target.value } : item))} /></label>
                  <label>Alt KO<input value={image.koAlt} onChange={(event) => onChange(product.images.map((item) => item.id === image.id ? { ...item, koAlt: event.target.value } : item))} /></label>
                  <div className="admin-media-card__actions">
                    <button type="button" onClick={() => void saveAlt(image)}>Lưu alt</button>
                    {image.role !== "PRIMARY" && <button type="button" onClick={() => void makePrimary(image)}>Đặt làm chính</button>}
                    <button type="button" disabled={index === 0} onClick={() => void move(index, -1)} aria-label={`Đưa ảnh ${index + 1} lên`}>↑</button>
                    <button type="button" disabled={index === product.images.length - 1} onClick={() => void move(index, 1)} aria-label={`Đưa ảnh ${index + 1} xuống`}>↓</button>
                    <button className="admin-danger-link" type="button" onClick={() => void remove(image)}>Gỡ</button>
                  </div>
                </div>
              </article>
            ))}</div>
          )}
        </fieldset>
      )}
    </section>
  );
}
