import { useState } from "react";
import type { AdminProductDraft, AdminTaxonomy, LocalizedProductContent } from "../types";

interface ProductDetailsFormProps {
  product: AdminProductDraft;
  taxonomy: AdminTaxonomy;
  onChange: (product: AdminProductDraft) => void;
  disabled?: boolean;
}

function TextContentFields({ locale, value, onChange }: {
  locale: "VI" | "KO";
  value: LocalizedProductContent;
  onChange: (value: LocalizedProductContent) => void;
}) {
  const update = (field: keyof LocalizedProductContent, next: string) => onChange({ ...value, [field]: next });
  return (
    <div className="admin-field-grid">
      <label className="admin-field-span">Tên sản phẩm {locale}<input value={value.name} onChange={(event) => update("name", event.target.value)} /></label>
      <label className="admin-field-span">Mô tả ngắn<textarea rows={2} value={value.shortDescription} onChange={(event) => update("shortDescription", event.target.value)} /></label>
      <label className="admin-field-span">Mô tả đầy đủ<textarea rows={5} value={value.description} onChange={(event) => update("description", event.target.value)} /></label>
      <label className="admin-field-span">Thành phần <small>Mỗi dòng một thành phần</small><textarea rows={4} value={value.composition} onChange={(event) => update("composition", event.target.value)} /></label>
      <label>SEO title<input value={value.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} /></label>
      <label>SEO description<textarea rows={3} value={value.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} /></label>
    </div>
  );
}

export function ProductDetailsForm({ product, taxonomy, onChange, disabled }: ProductDetailsFormProps) {
  const [locale, setLocale] = useState<"vi" | "ko">("vi");
  const update = <K extends keyof AdminProductDraft>(field: K, value: AdminProductDraft[K]) => onChange({ ...product, [field]: value });
  const toggleRelation = (field: "occasionIds" | "toneIds", id: string) => {
    const current = product[field];
    update(field, current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  return (
    <fieldset className="admin-editor-sections" disabled={disabled}>
      <section className="admin-editor-section">
        <header><span>01</span><div><h2>Thông tin chung</h2><p>Định danh và trạng thái vận hành của sản phẩm.</p></div></header>
        <div className="admin-field-grid">
          <label>Slug<input required value={product.slug} placeholder="rose-nocturne" onChange={(event) => update("slug", event.target.value.toLowerCase().trim())} /><small>Chữ thường, số và dấu gạch nối.</small></label>
          <label>Loại sản phẩm<select value={product.productType} onChange={(event) => update("productType", event.target.value as AdminProductDraft["productType"])}><option value="READY_MADE_BOUQUET">Bó hoa mẫu</option><option value="FLORIST_CHOICE">Florist's Choice</option><option value="CUSTOM_BOUQUET">Custom Bouquet</option></select></label>
          <label>Tình trạng<select value={product.availability} onChange={(event) => update("availability", event.target.value as AdminProductDraft["availability"])}><option value="AVAILABLE">Có sẵn</option><option value="SEASONAL">Theo mùa</option><option value="UNAVAILABLE">Tạm hết</option></select></label>
          <label>Thứ tự hiển thị<input type="number" min={0} step={1} value={product.sortOrder} onChange={(event) => update("sortOrder", Number(event.target.value))} /></label>
          <label className="admin-check admin-field-span"><input type="checkbox" checked={product.sameDayEligible} onChange={(event) => update("sameDayEligible", event.target.checked)} /><span><strong>Có thể giao trong ngày</strong><small>Vẫn phụ thuộc cutoff và khu vực ở bước sau.</small></span></label>
        </div>
      </section>

      <section className="admin-editor-section">
        <header><span>02</span><div><h2>Nội dung song ngữ</h2><p>Tên VI và KO là bắt buộc khi xuất bản.</p></div></header>
        <div className="admin-tabs" role="tablist" aria-label="Ngôn ngữ nội dung">
          <button type="button" role="tab" aria-selected={locale === "vi"} onClick={() => setLocale("vi")}>Tiếng Việt {product.vi.name.trim() ? "✓" : ""}</button>
          <button type="button" role="tab" aria-selected={locale === "ko"} onClick={() => setLocale("ko")}>한국어 {product.ko.name.trim() ? "✓" : ""}</button>
        </div>
        {locale === "vi"
          ? <TextContentFields locale="VI" value={product.vi} onChange={(value) => update("vi", value)} />
          : <TextContentFields locale="KO" value={product.ko} onChange={(value) => update("ko", value)} />}
      </section>

      <section className="admin-editor-section">
        <header><span>03</span><div><h2>Biến thể & giá</h2><p>Giá là số nguyên VND. Biến thể tắt sẽ không bán công khai.</p></div></header>
        <div className="admin-variant-list">
          {product.variants.length === 0 && <p className="admin-inline-empty">Chưa có biến thể.</p>}
          {product.variants.map((variant, index) => (
            <div className="admin-variant" key={variant.id ?? `new-${index}`}>
              <div className="admin-variant__heading"><strong>Biến thể {index + 1}</strong><button type="button" onClick={() => update("variants", product.variants.filter((_, itemIndex) => itemIndex !== index))}>Bỏ biến thể</button></div>
              <div className="admin-field-grid admin-field-grid--three">
                <label>Mã ổn định<input value={variant.stableCode} placeholder="standard" onChange={(event) => update("variants", product.variants.map((item, itemIndex) => itemIndex === index ? { ...item, stableCode: event.target.value.toLowerCase() } : item))} /></label>
                <label>Giá VND<input type="number" min={0} step={1000} value={variant.priceAmount ?? ""} onChange={(event) => update("variants", product.variants.map((item, itemIndex) => itemIndex === index ? { ...item, priceAmount: event.target.value === "" ? null : Number(event.target.value) } : item))} /></label>
                <label>Thứ tự<input type="number" min={0} step={1} value={variant.sortOrder} onChange={(event) => update("variants", product.variants.map((item, itemIndex) => itemIndex === index ? { ...item, sortOrder: Number(event.target.value) } : item))} /></label>
                <label>Tên VI<input value={variant.viName} onChange={(event) => update("variants", product.variants.map((item, itemIndex) => itemIndex === index ? { ...item, viName: event.target.value } : item))} /></label>
                <label>Tên KO<input value={variant.koName} onChange={(event) => update("variants", product.variants.map((item, itemIndex) => itemIndex === index ? { ...item, koName: event.target.value } : item))} /></label>
                <label className="admin-check admin-check--compact"><input type="checkbox" checked={variant.active} onChange={(event) => update("variants", product.variants.map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item))} /><span>Đang hoạt động</span></label>
              </div>
            </div>
          ))}
        </div>
        <button className="admin-button admin-button--secondary" type="button" onClick={() => update("variants", [...product.variants, { stableCode: "", priceAmount: null, active: true, sortOrder: product.variants.length, viName: "", koName: "" }])}>+ Thêm biến thể</button>
      </section>

      <section className="admin-editor-section">
        <header><span>04</span><div><h2>Dịp tặng & tone màu</h2><p>Dữ liệu taxonomy lấy trực tiếp từ Supabase.</p></div></header>
        <div className="admin-taxonomy-grid">
          <fieldset><legend>Dịp tặng</legend>{taxonomy.occasions.map((item) => <label className="admin-check" key={item.id}><input type="checkbox" checked={product.occasionIds.includes(item.id)} onChange={() => toggleRelation("occasionIds", item.id)} /><span><strong>{item.name}</strong><small>{item.secondaryName}</small></span></label>)}</fieldset>
          <fieldset><legend>Tone màu</legend>{taxonomy.tones.map((item) => <label className="admin-check" key={item.id}><input type="checkbox" checked={product.toneIds.includes(item.id)} onChange={() => toggleRelation("toneIds", item.id)} /><i style={{ background: item.swatchValue ?? undefined }} aria-hidden="true" /><span><strong>{item.name}</strong><small>{item.secondaryName}</small></span></label>)}</fieldset>
        </div>
      </section>
    </fieldset>
  );
}
