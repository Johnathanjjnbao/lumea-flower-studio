import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createAdminBuilderRepository } from "../data/adminBuilderRepository";
import { emptyAdminWrappingVariant, type AdminWrappingVariantDraft, type VisibilityStatus } from "../types";

function issuesFor(variant: AdminWrappingVariantDraft) {
  const issues: string[] = [];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variant.stableCode)) issues.push("Mã ổn định chưa hợp lệ.");
  if (!variant.vi.name.trim() || !variant.ko.name.trim()) issues.push("Tên VI và KO là bắt buộc.");
  if (!/^#[0-9A-Fa-f]{6}$/.test(variant.swatch)) issues.push("Swatch phải có dạng #RRGGBB.");
  if (variant.priceModifier === null || !Number.isInteger(variant.priceModifier) || variant.priceModifier < 0) issues.push("Phụ phí phải là số nguyên VND không âm.");
  if (!Number.isInteger(variant.sortOrder) || variant.sortOrder < 0) issues.push("Thứ tự phải là số nguyên không âm.");
  return issues;
}

export function AdminBuilderColorEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const repository = useMemo(() => createAdminBuilderRepository(), []);
  const [variant, setVariant] = useState<AdminWrappingVariantDraft>(() => emptyAdminWrappingVariant());
  const [locale, setLocale] = useState<"vi" | "ko">("vi");
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    repository.getWrappingVariant(id).then((found) => { if (active && found) setVariant(found); else if (active) setNotice({ tone: "error", text: "Không tìm thấy màu gói." }); })
      .catch((reason: unknown) => { if (active) setNotice({ tone: "error", text: reason instanceof Error ? reason.message : "Không thể tải màu gói." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, repository]);
  const save = async () => {
    const issues = issuesFor(variant);
    if (issues.length) { setNotice({ tone: "error", text: issues.join(" ") }); return; }
    setBusy(true);
    try { const saved = await repository.saveWrappingVariant(variant); setVariant(saved); setNotice({ tone: "success", text: "Đã lưu màu gói." }); if (!id) navigate(`/admin/builder/wrappings/colors/${saved.id}`, { replace: true }); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không thể lưu màu gói." }); }
    finally { setBusy(false); }
  };
  const changeVisibility = async (visibility: VisibilityStatus) => {
    if (!variant.id) return;
    setBusy(true);
    try { await repository.setWrappingVariantVisibility(variant.id, visibility); setVariant((current) => ({ ...current, visibility })); setNotice({ tone: "success", text: `Đã chuyển trạng thái sang ${visibility}.` }); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không thể đổi trạng thái." }); }
    finally { setBusy(false); }
  };
  if (loading) return <p className="admin-empty" aria-busy="true">Đang tải màu gói…</p>;
  const copy = variant[locale];
  return (
    <section className="admin-page admin-editor-page"><header className="admin-editor-heading"><div><Link to="/admin/builder/wrappings">← Giấy gói</Link><span className="admin-kicker">WRAP COLOR</span><h1>{variant.id ? variant.vi.name || variant.stableCode : "Thêm màu gói"}</h1></div><div className="admin-editor-heading__status"><span className={`admin-status admin-status--${variant.visibility.toLowerCase()}`}>{variant.visibility}</span></div></header>
      {notice && <p className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
      <div className="admin-editor-layout"><div className="admin-editor-sections"><section className="admin-editor-section"><header><span>01</span><div><h2>Màu và giá</h2><p>Swatch dùng định dạng CSS an toàn #RRGGBB.</p></div></header><div className="admin-field-grid admin-field-grid--three"><label>Mã ổn định<input value={variant.stableCode} onChange={(event) => setVariant({ ...variant, stableCode: event.target.value })} /></label><label>Phụ phí (VND)<input type="number" min="0" step="1000" value={variant.priceModifier ?? ""} onChange={(event) => setVariant({ ...variant, priceModifier: event.target.value === "" ? null : Number(event.target.value) })} /></label><label>Thứ tự<input type="number" min="0" value={variant.sortOrder} onChange={(event) => setVariant({ ...variant, sortOrder: Number(event.target.value) })} /></label><label>Màu swatch<div className="admin-color-input"><input type="color" value={variant.swatch} onChange={(event) => setVariant({ ...variant, swatch: event.target.value.toUpperCase() })} /><input value={variant.swatch} onChange={(event) => setVariant({ ...variant, swatch: event.target.value })} /></div></label></div></section><section className="admin-editor-section"><header><span>02</span><div><h2>Nội dung VI / KO</h2><p>Nhãn màu hiển thị trong Builder.</p></div></header><div className="admin-tabs" role="tablist"><button type="button" role="tab" aria-selected={locale === "vi"} onClick={() => setLocale("vi")}>Tiếng Việt</button><button type="button" role="tab" aria-selected={locale === "ko"} onClick={() => setLocale("ko")}>한국어</button></div><div className="admin-field-grid"><label className="admin-field-span">Tên<input value={copy.name} onChange={(event) => setVariant({ ...variant, [locale]: { ...copy, name: event.target.value } })} /></label><label className="admin-field-span">Mô tả<textarea rows={4} value={copy.description} onChange={(event) => setVariant({ ...variant, [locale]: { ...copy, description: event.target.value } })} /></label></div></section></div><aside className="admin-publish-panel"><span className="admin-kicker">PUBLISH</span><h2>Lưu & hiển thị</h2><p>Màu ẩn sẽ biến mất khỏi mọi tổ hợp public.</p><button className="admin-button admin-button--primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>{variant.id && variant.visibility !== "PUBLISHED" && variant.visibility !== "ARCHIVED" && <button className="admin-button admin-button--secondary" type="button" disabled={busy || issuesFor(variant).length > 0} onClick={() => void changeVisibility("PUBLISHED")}>Xuất bản</button>}{variant.id && variant.visibility === "PUBLISHED" && <button className="admin-button admin-button--secondary" type="button" disabled={busy} onClick={() => void changeVisibility("HIDDEN")}>Ẩn khỏi Builder</button>}{variant.id && variant.visibility !== "ARCHIVED" && <button className="admin-danger-button" type="button" disabled={busy} onClick={() => void changeVisibility("ARCHIVED")}>Lưu trữ</button>}</aside></div>
    </section>
  );
}
