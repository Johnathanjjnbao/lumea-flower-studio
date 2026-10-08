import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminCategoryError, createAdminCategoryRepository, emptyAdminCategory, type AdminCategory } from "./repository";

function CategoryCard({ category, busy, onChange, onSave, onArchive }: {
  category: AdminCategory;
  busy: boolean;
  onChange: (next: AdminCategory) => void;
  onSave: () => void;
  onArchive: () => void;
}) {
  const update = <K extends keyof AdminCategory>(key: K, value: AdminCategory[K]) => onChange({ ...category, [key]: value });
  return <article className="admin-operation-card">
    <header><div><strong>{category.id ? category.stableCode : "Category mới"}</strong><small>{category.productCount} sản phẩm</small></div><label className="admin-check admin-check--compact"><input type="checkbox" checked={category.active} onChange={(event) => update("active", event.target.checked)} /><span>Hiển thị công khai</span></label></header>
    <div className="admin-field-grid admin-field-grid--three">
      <label>Mã ổn định<input required disabled={Boolean(category.id)} value={category.stableCode} placeholder="bouquets" onChange={(event) => update("stableCode", event.target.value.toLowerCase().trim())} /></label>
      <label>Slug<input required value={category.slug} placeholder="bouquets" onChange={(event) => update("slug", event.target.value.toLowerCase().trim())} /></label>
      <label>Thứ tự<input type="number" min={0} step={1} value={category.sortOrder} onChange={(event) => update("sortOrder", Number(event.target.value))} /></label>
    </div>
    {(["vi", "ko"] as const).map((locale) => <fieldset key={locale}><legend>{locale.toUpperCase()}</legend><div className="admin-field-grid"><label>Tên<input required value={category[locale].name} onChange={(event) => update(locale, { ...category[locale], name: event.target.value })} /></label><label className="admin-field-span">Mô tả<textarea rows={2} value={category[locale].description} onChange={(event) => update(locale, { ...category[locale], description: event.target.value })} /></label></div></fieldset>)}
    <div className="admin-editor-actions"><button className="admin-button admin-button--primary" type="button" disabled={busy} onClick={onSave}>{busy ? "Đang lưu…" : "Lưu Category"}</button>{category.id && <button className="admin-button admin-button--secondary" type="button" disabled={busy || category.productCount > 0} title={category.productCount > 0 ? "Hãy chuyển sản phẩm sang Category khác trước." : undefined} onClick={onArchive}>Archive</button>}</div>
    {category.productCount > 0 && <p className="admin-table-secondary">Category đang được dùng. Có thể tắt để ẩn khỏi storefront; không thể archive cho tới khi chuyển hết sản phẩm.</p>}
  </article>;
}

export function AdminCategoriesPage() {
  const repository = useMemo(() => createAdminCategoryRepository(), []);
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [draft, setDraft] = useState(() => emptyAdminCategory());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const load = useCallback(async () => { setLoading(true); try { const next = await repository.list(); setItems(next); setDraft(emptyAdminCategory((next.length + 1) * 10)); } catch { setNotice({ tone: "error", text: "Không thể tải Categories." }); } finally { setLoading(false); } }, [repository]);
  useEffect(() => { document.title = "Categories — Luméa Admin"; void load(); }, [load]);
  const save = async (item: AdminCategory) => { if (item.id && !item.active && item.productCount > 0 && !window.confirm(`Tắt Category “${item.vi.name}” sẽ ẩn các sản phẩm thuộc Category này khỏi storefront. Tiếp tục?`)) return; const key = item.id ?? "new"; setBusy(key); setNotice(null); try { await repository.save(item); await load(); setNotice({ tone: "success", text: "Đã lưu Category và nội dung VI/KO." }); } catch (error) { setNotice({ tone: "error", text: error instanceof AdminCategoryError ? error.code : "Không thể lưu Category." }); } finally { setBusy(null); } };
  const archive = async (item: AdminCategory) => { if (!item.id || item.productCount > 0 || !window.confirm(`Archive Category “${item.vi.name}”?`)) return; setBusy(item.id); try { await repository.archive(item.id); await load(); setNotice({ tone: "success", text: "Đã archive Category." }); } catch (error) { setNotice({ tone: "error", text: error instanceof AdminCategoryError ? error.code : "Không thể archive Category." }); } finally { setBusy(null); } };
  const move = async (index: number, offset: -1 | 1) => { const target = index + offset; if (target < 0 || target >= items.length) return; const ordered = [...items]; [ordered[index], ordered[target]] = [ordered[target], ordered[index]]; if (ordered.some((item) => !item.id)) return; setBusy("order"); try { await repository.reorder(ordered.map((item) => item.id!)); await load(); setNotice({ tone: "success", text: "Đã lưu thứ tự Category." }); } catch { setNotice({ tone: "error", text: "Không thể đổi thứ tự Category." }); } finally { setBusy(null); } };
  if (loading && items.length === 0) return <section className="admin-page" aria-busy="true"><div className="admin-empty">Đang tải Categories…</div></section>;
  return <section className="admin-page"><header className="admin-page-heading"><span className="admin-kicker">CATALOG</span><h1>Categories</h1><p>Category là nhóm Catalog chính. Occasion vẫn là taxonomy dịp tặng riêng.</p></header>{notice && <div className={`admin-alert admin-alert--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</div>}<section className="admin-editor-section"><header><span>01</span><div><h2>Tạo Category</h2><p>Mã ổn định không thể đổi sau khi tạo.</p></div></header><CategoryCard category={draft} busy={busy === "new"} onChange={setDraft} onSave={() => void save(draft)} onArchive={() => undefined} /></section><section className="admin-editor-section"><header><span>02</span><div><h2>Danh sách & thứ tự</h2><p>Move thay đổi thứ tự hiển thị; Save lưu nội dung và trạng thái.</p></div></header><div className="admin-operations-list">{items.map((item, index) => <div key={item.id}><div className="admin-row-actions"><button type="button" disabled={Boolean(busy) || index === 0} onClick={() => void move(index, -1)}>↑</button><button type="button" disabled={Boolean(busy) || index === items.length - 1} onClick={() => void move(index, 1)}>↓</button></div><CategoryCard category={item} busy={busy === item.id} onChange={(next) => setItems((current) => current.map((value) => value.id === item.id ? next : value))} onSave={() => void save(item)} onArchive={() => void archive(item)} /></div>)}</div></section></section>;
}
