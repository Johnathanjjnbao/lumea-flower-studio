import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createAdminBuilderRepository } from "../data/adminBuilderRepository";
import { emptyAdminFlower, type AdminFlowerDraft, type VisibilityStatus } from "../types";

function issuesFor(flower: AdminFlowerDraft) {
  const issues: string[] = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(flower.stableCode)) issues.push("Mã ổn định chỉ dùng chữ thường, số và dấu gạch nối.");
  if (!flower.vi.name.trim() || !flower.ko.name.trim()) issues.push("Tên VI và KO là bắt buộc.");
  if (flower.pricePerStem === null || !Number.isInteger(flower.pricePerStem) || flower.pricePerStem < 0) issues.push("Giá mỗi cành phải là số nguyên VND không âm.");
  if (flower.sortOrder < 0 || !Number.isInteger(flower.sortOrder)) issues.push("Thứ tự phải là số nguyên không âm.");
  return issues;
}

export function AdminBuilderFlowerEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const repository = useMemo(() => createAdminBuilderRepository(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [flower, setFlower] = useState<AdminFlowerDraft>(() => emptyAdminFlower());
  const [locale, setLocale] = useState<"vi" | "ko">("vi");
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    repository.getFlower(id).then((data) => {
      if (!active) return;
      if (!data) setNotice({ tone: "error", text: "Không tìm thấy loại hoa." }); else setFlower(data);
    }).catch((reason: unknown) => { if (active) setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Không thể tải loại hoa." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, repository]);

  const save = async () => {
    const issues = issuesFor(flower);
    if (issues.length) { setNotice({ tone: "error", text: issues.join(" ") }); return; }
    setBusy(true);
    try {
      const saved = await repository.saveFlower(flower);
      setFlower(saved); setNotice({ tone: "success", text: "Đã lưu loại hoa." });
      if (!id) navigate(`/admin/builder/flowers/${saved.id}`, { replace: true });
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không thể lưu loại hoa." }); }
    finally { setBusy(false); }
  };

  const setVisibility = async (visibility: VisibilityStatus) => {
    if (!flower.id) return;
    setBusy(true);
    try { await repository.setFlowerVisibility(flower.id, visibility); setFlower((current) => ({ ...current, visibility })); setNotice({ tone: "success", text: `Đã chuyển trạng thái sang ${visibility}.` }); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không thể đổi trạng thái." }); }
    finally { setBusy(false); }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const image = await repository.uploadFlowerImage(flower, file, flower.image?.viAlt ?? flower.vi.name, flower.image?.koAlt ?? flower.ko.name);
      setFlower((current) => ({ ...current, image })); setNotice({ tone: "success", text: "Ảnh hoa đã được tải lên Storage." });
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không thể tải ảnh." }); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="admin-empty" aria-busy="true">Đang tải loại hoa…</p>;
  const copy = flower[locale];
  return (
    <section className="admin-page admin-editor-page">
      <header className="admin-editor-heading"><div><Link to="/admin/builder/flowers">← Hoa theo cành</Link><span className="admin-kicker">BUILDER FLOWER</span><h1>{flower.id ? flower.vi.name || flower.stableCode : "Thêm loại hoa"}</h1></div><div className="admin-editor-heading__status"><span className={`admin-status admin-status--${flower.visibility.toLowerCase()}`}>{flower.visibility}</span></div></header>
      {notice && <p className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
      <div className="admin-editor-layout">
        <div className="admin-editor-sections">
          <section className="admin-editor-section"><header><span>01</span><div><h2>Thông tin vận hành</h2><p>Giá và availability độc lập với trạng thái public.</p></div></header><div className="admin-field-grid admin-field-grid--three">
            <label>Mã ổn định<input value={flower.stableCode} onChange={(event) => setFlower({ ...flower, stableCode: event.target.value })} /></label>
            <label>Giá / cành (VND)<input type="number" min="0" step="1000" value={flower.pricePerStem ?? ""} onChange={(event) => setFlower({ ...flower, pricePerStem: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label>Thứ tự<input type="number" min="0" value={flower.sortOrder} onChange={(event) => setFlower({ ...flower, sortOrder: Number(event.target.value) })} /></label>
            <label>Tình trạng<select value={flower.availability} onChange={(event) => setFlower({ ...flower, availability: event.target.value as AdminFlowerDraft["availability"] })}><option value="AVAILABLE">Có sẵn</option><option value="SEASONAL">Theo mùa</option><option value="UNAVAILABLE">Tạm hết</option></select></label>
            <label className="admin-check"><input type="checkbox" checked={flower.seasonalNoteRequired} onChange={(event) => setFlower({ ...flower, seasonalNoteRequired: event.target.checked })} /><span>Yêu cầu ghi chú theo mùa<small>Dùng cho thông tin vận hành tương lai.</small></span></label>
          </div></section>
          <section className="admin-editor-section"><header><span>02</span><div><h2>Nội dung VI / KO</h2><p>Tên, mô tả và alt text hiển thị theo ngôn ngữ storefront.</p></div></header>
            <div className="admin-tabs" role="tablist"><button type="button" role="tab" aria-selected={locale === "vi"} onClick={() => setLocale("vi")}>Tiếng Việt</button><button type="button" role="tab" aria-selected={locale === "ko"} onClick={() => setLocale("ko")}>한국어</button></div>
            <div className="admin-field-grid"><label className="admin-field-span">Tên {locale.toUpperCase()}<input value={copy.name} onChange={(event) => setFlower({ ...flower, [locale]: { ...copy, name: event.target.value } })} /></label><label className="admin-field-span">Mô tả<textarea rows={4} value={copy.description} onChange={(event) => setFlower({ ...flower, [locale]: { ...copy, description: event.target.value } })} /></label><label className="admin-field-span">Alt text ảnh<input value={flower.image?.[locale === "vi" ? "viAlt" : "koAlt"] ?? ""} onChange={(event) => flower.image && setFlower({ ...flower, image: { ...flower.image, [locale === "vi" ? "viAlt" : "koAlt"]: event.target.value } })} disabled={!flower.image} /></label></div>
          </section>
          <section className="admin-editor-section"><header><span>03</span><div><h2>Ảnh hoa</h2><p>JPEG, PNG, WebP hoặc AVIF; đường dẫn Storage dùng UUID.</p></div></header>
            {flower.image ? <div className="admin-builder-image"><img src={flower.image.url} alt={flower.image.viAlt} /><p>{flower.image.storagePath}</p></div> : <p className="admin-inline-empty">Chưa có ảnh. Cần ảnh trước khi xuất bản.</p>}
            {flower.id ? <label className="admin-file-input">{busy ? "Đang xử lý…" : flower.image ? "Thay ảnh" : "+ Tải ảnh"}<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void upload(event)} /></label> : <p className="admin-inline-empty">Lưu bản nháp trước khi tải ảnh.</p>}
          </section>
        </div>
        <aside className="admin-publish-panel"><span className="admin-kicker">PUBLISH</span><h2>Lưu & hiển thị</h2><p>Builder public chỉ đọc record PUBLISHED.</p><button className="admin-button admin-button--primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>{flower.id && flower.visibility !== "PUBLISHED" && flower.visibility !== "ARCHIVED" && <button className="admin-button admin-button--secondary" type="button" disabled={busy || issuesFor(flower).length > 0 || !flower.image} onClick={() => void setVisibility("PUBLISHED")}>Xuất bản</button>}{flower.id && flower.visibility === "PUBLISHED" && <button className="admin-button admin-button--secondary" type="button" disabled={busy} onClick={() => void setVisibility("HIDDEN")}>Ẩn khỏi Builder</button>}{flower.id && flower.visibility !== "ARCHIVED" && <button className="admin-danger-button" type="button" disabled={busy} onClick={() => void setVisibility("ARCHIVED")}>Lưu trữ</button>}</aside>
      </div>
    </section>
  );
}
