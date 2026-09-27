import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createAdminBuilderRepository } from "../data/adminBuilderRepository";
import { emptyAdminWrappingOption, type AdminWrappingOptionDraft, type AdminWrappingVariantDraft, type VisibilityStatus } from "../types";

function issuesFor(option: AdminWrappingOptionDraft) {
  const issues: string[] = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(option.stableCode)) issues.push("Mã ổn định chưa hợp lệ.");
  if (!option.vi.name.trim() || !option.ko.name.trim()) issues.push("Tên VI và KO là bắt buộc.");
  if (option.priceModifier === null || !Number.isInteger(option.priceModifier) || option.priceModifier < 0) issues.push("Phụ phí phải là số nguyên VND không âm.");
  if (!Number.isInteger(option.sortOrder) || option.sortOrder < 0) issues.push("Thứ tự phải là số nguyên không âm.");
  if (option.compatibleVariantIds.length === 0) issues.push("Chọn ít nhất một màu tương thích.");
  return issues;
}

export function AdminBuilderWrappingEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const repository = useMemo(() => createAdminBuilderRepository(), []);
  const [option, setOption] = useState<AdminWrappingOptionDraft>(() => emptyAdminWrappingOption());
  const [variants, setVariants] = useState<AdminWrappingVariantDraft[]>([]);
  const [locale, setLocale] = useState<"vi" | "ko">("vi");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([id ? repository.getWrappingOption(id) : Promise.resolve(null), repository.listWrappingVariants()]).then(([found, colors]) => {
      if (!active) return;
      if (id && !found) setNotice({ tone: "error", text: "Không tìm thấy kiểu gói." });
      if (found) setOption(found);
      setVariants(colors.filter((color) => color.visibility !== "ARCHIVED"));
    }).catch((reason: unknown) => { if (active) setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Không thể tải kiểu gói." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, repository]);

  const save = async () => {
    const issues = issuesFor(option);
    if (issues.length) { setNotice({ tone: "error", text: issues.join(" ") }); return; }
    setBusy(true);
    try { const saved = await repository.saveWrappingOption(option); setOption(saved); setNotice({ tone: "success", text: "Đã lưu kiểu gói và compatibility." }); if (!id) navigate(`/admin/builder/wrappings/${saved.id}`, { replace: true }); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không thể lưu kiểu gói." }); }
    finally { setBusy(false); }
  };
  const changeVisibility = async (visibility: VisibilityStatus) => {
    if (!option.id) return;
    setBusy(true);
    try { await repository.setWrappingOptionVisibility(option.id, visibility); setOption((current) => ({ ...current, visibility })); setNotice({ tone: "success", text: `Đã chuyển trạng thái sang ${visibility}.` }); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không thể đổi trạng thái." }); }
    finally { setBusy(false); }
  };
  if (loading) return <p className="admin-empty" aria-busy="true">Đang tải kiểu gói…</p>;
  const copy = option[locale];
  return (
    <section className="admin-page admin-editor-page">
      <header className="admin-editor-heading"><div><Link to="/admin/builder/wrappings">← Giấy gói</Link><span className="admin-kicker">WRAP TYPE</span><h1>{option.id ? option.vi.name || option.stableCode : "Thêm kiểu gói"}</h1></div><div className="admin-editor-heading__status"><span className={`admin-status admin-status--${option.visibility.toLowerCase()}`}>{option.visibility}</span></div></header>
      {notice && <p className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
      <div className="admin-editor-layout"><div className="admin-editor-sections">
        <section className="admin-editor-section"><header><span>01</span><div><h2>Thông tin kiểu gói</h2><p>Phụ phí kiểu gói được cộng vào tổng live.</p></div></header><div className="admin-field-grid admin-field-grid--three"><label>Mã ổn định<input value={option.stableCode} onChange={(event) => setOption({ ...option, stableCode: event.target.value })} /></label><label>Phụ phí (VND)<input type="number" min="0" step="1000" value={option.priceModifier ?? ""} onChange={(event) => setOption({ ...option, priceModifier: event.target.value === "" ? null : Number(event.target.value) })} /></label><label>Thứ tự<input type="number" min="0" value={option.sortOrder} onChange={(event) => setOption({ ...option, sortOrder: Number(event.target.value) })} /></label></div></section>
        <section className="admin-editor-section"><header><span>02</span><div><h2>Nội dung VI / KO</h2><p>Nội dung public theo locale hiện tại.</p></div></header><div className="admin-tabs" role="tablist"><button type="button" role="tab" aria-selected={locale === "vi"} onClick={() => setLocale("vi")}>Tiếng Việt</button><button type="button" role="tab" aria-selected={locale === "ko"} onClick={() => setLocale("ko")}>한국어</button></div><div className="admin-field-grid"><label className="admin-field-span">Tên<input value={copy.name} onChange={(event) => setOption({ ...option, [locale]: { ...copy, name: event.target.value } })} /></label><label className="admin-field-span">Mô tả<textarea rows={4} value={copy.description} onChange={(event) => setOption({ ...option, [locale]: { ...copy, description: event.target.value } })} /></label></div></section>
        <section className="admin-editor-section"><header><span>03</span><div><h2>Màu tương thích</h2><p>Builder chỉ hiển thị đúng các tổ hợp được chọn.</p></div></header><div className="admin-builder-compatibility">{variants.map((variant) => <label className="admin-check" key={variant.id}><input type="checkbox" checked={option.compatibleVariantIds.includes(variant.id!)} onChange={(event) => setOption({ ...option, compatibleVariantIds: event.target.checked ? [...option.compatibleVariantIds, variant.id!] : option.compatibleVariantIds.filter((item) => item !== variant.id) })} /><i style={{ backgroundColor: variant.swatch }} aria-hidden="true" /><span>{variant.vi.name}<small>{variant.stableCode} · {variant.visibility}</small></span></label>)}</div>{variants.length === 0 && <p className="admin-inline-empty">Tạo màu gói trước khi xuất bản kiểu gói.</p>}</section>
      </div><aside className="admin-publish-panel"><span className="admin-kicker">PUBLISH</span><h2>Lưu & hiển thị</h2><p>Compatibility được xác thực lại ở database.</p><button className="admin-button admin-button--primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>{option.id && option.visibility !== "PUBLISHED" && option.visibility !== "ARCHIVED" && <button className="admin-button admin-button--secondary" type="button" disabled={busy || issuesFor(option).length > 0} onClick={() => void changeVisibility("PUBLISHED")}>Xuất bản</button>}{option.id && option.visibility === "PUBLISHED" && <button className="admin-button admin-button--secondary" type="button" disabled={busy} onClick={() => void changeVisibility("HIDDEN")}>Ẩn khỏi Builder</button>}{option.id && option.visibility !== "ARCHIVED" && <button className="admin-danger-button" type="button" disabled={busy} onClick={() => void changeVisibility("ARCHIVED")}>Lưu trữ</button>}</aside></div>
    </section>
  );
}
