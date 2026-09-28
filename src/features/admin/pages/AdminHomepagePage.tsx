import { useCallback, useEffect, useMemo, useState } from "react";
import { HomepageCopyEditor } from "../components/HomepageCopyEditor";
import { HomepageMediaPanel } from "../components/HomepageMediaPanel";
import { createAdminHomepageRepository } from "../data/adminHomepageRepository";
import type { AdminHomepageFeature, AdminHomepageMedia, AdminHomepageSection, AdminHomepageSnapshot } from "../types";

const sectionLabels: Record<AdminHomepageSection["key"], { name: string; description: string }> = {
  hero: { name: "Hero", description: "Lời hứa thương hiệu, hai CTA và hai ảnh mở đầu." },
  occasions: { name: "Theo dịp", description: "Tiêu đề section và ảnh cho sáu dịp; tên/link vẫn thuộc Occasion taxonomy." },
  best_sellers: { name: "Best Sellers", description: "Copy section và tối đa sáu Product đã publish; Product vẫn sở hữu tên, ảnh và giá." },
  budget: { name: "Theo ngân sách", description: "Copy và bốn ảnh; ngưỡng lọc giá không đổi trong bước này." },
  same_day: { name: "Giao trong ngày", description: "Marketing copy, CTA và ảnh. Quy tắc cutoff thuộc Delivery Settings sau này." },
  florist_choice: { name: "Florist’s Choice", description: "Copy, CTA và ảnh đại diện cho dịch vụ." },
  create_bouquet: { name: "Tạo bó hoa", description: "Nội dung promo, CTA Builder, CTA hỗ trợ và ảnh." },
  why_lumea: { name: "Why Luméa", description: "Tiêu đề section và ba lời hứa dịch vụ có nội dung/ảnh riêng." },
  gallery: { name: "Gallery", description: "Tối đa 10 ảnh, alt/caption VI/KO, thứ tự và trạng thái active." },
  visit: { name: "Ghé studio", description: "Tiêu đề, đoạn dẫn, địa chỉ hiển thị và giờ mở cửa." },
};

const ctaOptions = [
  ["/flowers", "Bộ sưu tập hoa"], ["/create-bouquet", "Tạo bó hoa"], ["/flowers?sameDay=true", "Hoa giao trong ngày"],
  ["#best-sellers", "Best Sellers"], ["#florist-choice", "Florist’s Choice"], ["#custom", "Tạo bó hoa trên Home"], ["#gallery", "Gallery"], ["#visit", "Ghé studio"],
] as const;

const visibilityEditableSections = new Set<AdminHomepageSection["key"]>(["same_day", "florist_choice", "create_bouquet", "why_lumea", "gallery"]);

export function AdminHomepagePage() {
  const repository = useMemo(() => createAdminHomepageRepository(), []);
  const [snapshot, setSnapshot] = useState<AdminHomepageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setSnapshot(await repository.getHomepage()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải Homepage Admin."); }
    finally { setLoading(false); }
  }, [repository]);

  useEffect(() => { document.title = "Homepage — Luméa Admin"; void load(); }, [load]);

  const updateSection = (next: AdminHomepageSection) => setSnapshot((current) => current ? { ...current, sections: current.sections.map((section) => section.id === next.id ? next : section) } : current);
  const updateMedia = (sectionId: string, next: AdminHomepageMedia) => setSnapshot((current) => current ? {
    ...current,
    sections: current.sections.map((section) => section.id === sectionId ? { ...section, media: section.media.map((media) => media.id === next.id ? next : media) } : section),
  } : current);

  const run = async (key: string, task: () => Promise<void>, message: string) => {
    setBusy(key); setError(null); setSuccess(null);
    try { await task(); setSuccess(message); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Thao tác không hoàn tất."); }
    finally { setBusy(null); }
  };

  const moveGallery = async (section: AdminHomepageSection, mediaId: string, direction: -1 | 1) => {
    const media = section.media.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = media.findIndex((item) => item.id === mediaId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= media.length) return;
    [media[index], media[target]] = [media[target], media[index]];
    await run(`gallery-order-${mediaId}`, () => repository.reorderMedia(media), "Đã cập nhật thứ tự Gallery.");
  };

  if (loading && !snapshot) return <section className="admin-page" aria-busy="true"><div className="admin-empty"><h2>Đang tải Homepage…</h2><p>Đang đọc nội dung và media từ Supabase.</p></div></section>;
  if (!snapshot) return <section className="admin-page"><div className="admin-empty"><h1>Chưa thể mở Homepage</h1><p>{error}</p><button className="admin-button admin-button--primary" type="button" onClick={() => void load()}>Thử lại</button></div></section>;

  return <section className="admin-page admin-homepage-page">
    <header className="admin-page-heading admin-page-heading--row">
      <div><span className="admin-kicker">HOMEPAGE CONTENT</span><h1>Homepage</h1><p>Chỉnh nội dung, ảnh và tuyển chọn trong các slot cố định. Layout, typography và motion vẫn do React sở hữu.</p></div>
      <a className="admin-button admin-button--secondary" href={`${import.meta.env.BASE_URL}`} target="_blank" rel="noreferrer">Xem website ↗</a>
    </header>
    {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
    {success && <div className="admin-alert admin-alert--success" role="status">{success}</div>}
    <div className="admin-homepage-notice"><strong>10 section cố định</strong><span>Lưu từng section. Không autosave, không HTML/CSS tùy ý, không đổi thứ tự câu chuyện.</span></div>

    <div className="admin-homepage-sections">
      {snapshot.sections.map((section, index) => {
        const label = sectionLabels[section.key];
        const isBusy = busy?.includes(section.id) || busy?.includes(section.key);
        return <details className="admin-home-section" open={section.key === "hero"} key={section.id}>
          <summary><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{label.name}</strong><small>{label.description}</small></div><b>{section.enabled ? "Đang hiển thị" : "Đang ẩn"}</b></summary>
          <div className="admin-home-section__body">
            <div className="admin-home-section__controls">
              {visibilityEditableSections.has(section.key) && <label className="admin-check"><input type="checkbox" checked={section.enabled} onChange={(event) => updateSection({ ...section, enabled: event.target.checked })} /><span>Hiển thị section<small>Tắt sẽ gỡ section khỏi Home, không xoá nội dung.</small></span></label>}
              {section.primaryCtaTarget !== null && <label>Destination CTA chính<select value={section.primaryCtaTarget} onChange={(event) => updateSection({ ...section, primaryCtaTarget: event.target.value })}>{ctaOptions.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label>}
              {section.secondaryCtaTarget !== null && <label>Destination CTA phụ<select value={section.secondaryCtaTarget} onChange={(event) => updateSection({ ...section, secondaryCtaTarget: event.target.value })}>{ctaOptions.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label>}
            </div>
            <HomepageCopyEditor section={section} onChange={updateSection} />
            <button className="admin-button admin-button--primary" type="button" disabled={Boolean(isBusy)} onClick={() => void run(`section-${section.id}`, async () => {
              await repository.saveSection(section);
              if (section.key === "why_lumea") await repository.saveFeatures(section.features);
            }, `Đã lưu ${label.name}.`)}>{isBusy ? "Đang lưu…" : `Lưu ${label.name}`}</button>

            {section.key === "best_sellers" && <BestSellerCuration section={section} products={snapshot.products} busy={Boolean(isBusy)} onChange={updateSection} onSave={() => run(`curation-${section.id}`, () => repository.replaceCuration(section.id, section.curatedProductIds), "Đã lưu tuyển chọn Best Sellers.")} />}
            {section.key === "why_lumea" && <WhyFeatureEditor section={section} onChange={updateSection} onUpload={(feature, file) => run(`feature-${feature.id}`, () => repository.uploadFeatureImage(section, feature, file, feature.viAlt, feature.koAlt), "Đã thay ảnh Why Luméa.")} />}
            {(section.key === "gallery" || section.media.length > 0) && <HomepageMediaPanel
              section={section}
              gallery={section.key === "gallery"}
              onCopyChange={(media) => updateMedia(section.id, media)}
              onSaveCopy={(media) => run(`media-copy-${media.id}`, () => repository.updateMediaCopy(media), "Đã lưu alt/caption ảnh.")}
              onUpload={(slotKey, file, copy, sortOrder) => run(`media-upload-${section.key}`, () => repository.uploadSectionImage(section, slotKey, file, copy, sortOrder), "Đã cập nhật ảnh Homepage.")}
              onMove={(mediaId, direction) => moveGallery(section, mediaId, direction)}
              onRemove={(mediaId) => run(`media-remove-${mediaId}`, () => repository.deactivateMedia(mediaId), "Đã gỡ ảnh khỏi Gallery.")}
            />}
          </div>
        </details>;
      })}
    </div>
  </section>;
}

function BestSellerCuration({ section, products, busy, onChange, onSave }: { section: AdminHomepageSection; products: AdminHomepageSnapshot["products"]; busy: boolean; onChange: (section: AdminHomepageSection) => void; onSave: () => Promise<void> }) {
  const move = (productId: string, direction: -1 | 1) => {
    const next = [...section.curatedProductIds];
    const index = next.indexOf(productId);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...section, curatedProductIds: next });
  };
  return <div className="admin-home-subsection"><header><h3>Product được tuyển chọn</h3><p>Chỉ Product đã publish. Tối đa 6; tên, ảnh và giá tiếp tục đọc từ Product.</p></header>
    <div className="admin-curation-list">{section.curatedProductIds.map((id, index) => { const product = products.find((item) => item.id === id); return product ? <div key={id}>{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span>L</span>}<strong>{product.name}</strong><button type="button" disabled={index === 0} onClick={() => move(id, -1)}>↑</button><button type="button" disabled={index === section.curatedProductIds.length - 1} onClick={() => move(id, 1)}>↓</button><button type="button" onClick={() => onChange({ ...section, curatedProductIds: section.curatedProductIds.filter((productId) => productId !== id) })}>Bỏ</button></div> : null; })}</div>
    <label>Thêm Product<select defaultValue="" onChange={(event) => { const id = event.target.value; if (id && section.curatedProductIds.length < 6 && !section.curatedProductIds.includes(id)) onChange({ ...section, curatedProductIds: [...section.curatedProductIds, id] }); event.target.value = ""; }}><option value="">Chọn Product đã publish…</option>{products.filter((product) => !section.curatedProductIds.includes(product.id)).map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
    <button className="admin-button admin-button--secondary" type="button" disabled={busy || section.curatedProductIds.length > 6} onClick={() => void onSave()}>Lưu Best Sellers ({section.curatedProductIds.length}/6)</button>
  </div>;
}

function WhyFeatureEditor({ section, onChange, onUpload }: { section: AdminHomepageSection; onChange: (section: AdminHomepageSection) => void; onUpload: (feature: AdminHomepageFeature, file: File) => Promise<void> }) {
  const update = (next: AdminHomepageFeature) => onChange({ ...section, features: section.features.map((feature) => feature.id === next.id ? next : feature) });
  return <div className="admin-home-subsection"><header><h3>Ba lời hứa dịch vụ</h3><p>Nội dung và ảnh của từng card. Thứ tự/layout vẫn cố định.</p></header><div className="admin-why-grid">{section.features.map((feature) => <article key={feature.id}>
    {feature.imageUrl && <img src={feature.imageUrl} alt="" />}
    <strong>{feature.itemKey}</strong>
    {(["vi", "ko"] as const).map((locale) => <fieldset key={locale}><legend>{locale === "vi" ? "Tiếng Việt" : "한국어"}</legend><label>Nhãn<input value={feature[locale].label} onChange={(event) => update({ ...feature, [locale]: { ...feature[locale], label: event.target.value } })} /></label><label>Tiêu đề<input value={feature[locale].title} onChange={(event) => update({ ...feature, [locale]: { ...feature[locale], title: event.target.value } })} /></label><label>Nội dung<textarea rows={3} value={feature[locale].body} onChange={(event) => update({ ...feature, [locale]: { ...feature[locale], body: event.target.value } })} /></label><label>Alt ảnh<input value={locale === "vi" ? feature.viAlt : feature.koAlt} onChange={(event) => update({ ...feature, [locale === "vi" ? "viAlt" : "koAlt"]: event.target.value })} /></label></fieldset>)}
    <label className="admin-file-input">Thay ảnh<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(feature, file); event.target.value = ""; }} /></label>
  </article>)}</div></div>;
}
