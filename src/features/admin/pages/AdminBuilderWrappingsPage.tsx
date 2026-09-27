import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminBuilderRepository } from "../data/adminBuilderRepository";
import type { AdminWrappingOptionDraft, AdminWrappingVariantDraft } from "../types";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function AdminBuilderWrappingsPage() {
  const repository = useMemo(() => createAdminBuilderRepository(), []);
  const [options, setOptions] = useState<AdminWrappingOptionDraft[]>([]);
  const [variants, setVariants] = useState<AdminWrappingVariantDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([repository.listWrappingOptions(), repository.listWrappingVariants()]).then(([nextOptions, nextVariants]) => {
      if (active) { setOptions(nextOptions); setVariants(nextVariants); }
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu giấy gói."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repository]);
  return (
    <section className="admin-page">
      <header className="admin-page-heading admin-page-heading--row"><div><span className="admin-kicker">BOUQUET BUILDER</span><h1>Giấy gói</h1><p>Quản lý kiểu gói, màu sắc và tổ hợp được phép.</p></div><div className="admin-heading-actions"><Link className="admin-button admin-button--secondary" to="/admin/builder/wrappings/colors/new">+ Thêm màu</Link><Link className="admin-button admin-button--primary" to="/admin/builder/wrappings/new">+ Thêm kiểu gói</Link></div></header>
      {error && <p className="admin-alert admin-alert--error" role="alert">{error}</p>}
      {loading ? <p className="admin-empty" aria-busy="true">Đang tải giấy gói…</p> : <>
        <section className="admin-builder-group" aria-labelledby="wrapping-options-title"><header><div><span className="admin-kicker">WRAP TYPES</span><h2 id="wrapping-options-title">Kiểu gói</h2></div></header>{options.length === 0 ? <p className="admin-empty">Chưa có kiểu gói.</p> : <div className="admin-builder-card-grid">{options.map((option) => <article className="admin-builder-card" key={option.id}><div><span className={`admin-status admin-status--${option.visibility.toLowerCase()}`}>{option.visibility}</span><h3>{option.vi.name || option.stableCode}</h3><p>{option.vi.description}</p></div><dl><div><dt>Phụ phí</dt><dd>{money.format(option.priceModifier ?? 0)}</dd></div><div><dt>Màu hợp lệ</dt><dd>{option.compatibleVariantIds.length}</dd></div></dl><Link className="admin-row-link" to={`/admin/builder/wrappings/${option.id}`}>Sửa →</Link></article>)}</div>}</section>
        <section className="admin-builder-group" aria-labelledby="wrapping-colors-title"><header><div><span className="admin-kicker">COLORS & FINISHES</span><h2 id="wrapping-colors-title">Màu và bề mặt</h2></div></header>{variants.length === 0 ? <p className="admin-empty">Chưa có màu gói.</p> : <div className="admin-builder-card-grid">{variants.map((variant) => <article className="admin-builder-card" key={variant.id}><div className="admin-builder-color-title"><i style={{ backgroundColor: variant.swatch }} aria-hidden="true" /><div><span className={`admin-status admin-status--${variant.visibility.toLowerCase()}`}>{variant.visibility}</span><h3>{variant.vi.name || variant.stableCode}</h3></div></div><dl><div><dt>Phụ phí</dt><dd>{money.format(variant.priceModifier ?? 0)}</dd></div><div><dt>Swatch</dt><dd>{variant.swatch}</dd></div></dl><Link className="admin-row-link" to={`/admin/builder/wrappings/colors/${variant.id}`}>Sửa →</Link></article>)}</div>}</section>
      </>}
    </section>
  );
}
