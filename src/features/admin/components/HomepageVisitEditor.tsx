import { validateVisitSettings } from "../../homepage/visitLocation";
import type { AdminHomepageSection } from "../types";

export function HomepageVisitEditor({ section, onChange }: { section: AdminHomepageSection; onChange: (section: AdminHomepageSection) => void }) {
  const errors = validateVisitSettings(section.visit, section.vi, section.ko);
  const update = (next: Partial<AdminHomepageSection["visit"]>) => onChange({ ...section, visit: { ...section.visit, ...next } });

  return <fieldset className="admin-visit-settings">
    <legend>Vị trí và Google Maps</legend>
    <p>Nhập dữ liệu thật của studio. Hệ thống tự tạo map embed từ vị trí, không nhận mã iframe.</p>
    <label className="admin-check">
      <input type="checkbox" checked={section.visit.mapEnabled} onChange={(event) => update({ mapEnabled: event.target.checked })} />
      <span>Hiển thị Google Maps<small>Tắt để chỉ hiển thị địa chỉ và giờ mở cửa.</small></span>
    </label>
    <div className="admin-field-grid">
      <label>
        Số điện thoại
        <input type="tel" value={section.visit.phone} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "visit-phone-error" : undefined} onChange={(event) => update({ phone: event.target.value })} />
        {errors.phone && <small className="admin-field-error" id="visit-phone-error">{errors.phone}</small>}
      </label>
      <label className="admin-field-span">
        Vị trí dùng cho bản đồ
        <input value={section.visit.mapQuery} aria-invalid={Boolean(errors.mapQuery)} aria-describedby="visit-map-query-help" placeholder="Tên studio hoặc địa chỉ đầy đủ" onChange={(event) => update({ mapQuery: event.target.value })} />
        <small id="visit-map-query-help" className={errors.mapQuery ? "admin-field-error" : undefined}>{errors.mapQuery ?? "Google Maps dùng nội dung này để đặt pin."}</small>
      </label>
      <label className="admin-field-span">
        Liên kết Google Maps
        <input type="url" inputMode="url" value={section.visit.googleMapsUrl} aria-invalid={Boolean(errors.googleMapsUrl)} aria-describedby="visit-map-url-help" placeholder="https://www.google.com/maps/..." onChange={(event) => update({ googleMapsUrl: event.target.value })} />
        <small id="visit-map-url-help" className={errors.googleMapsUrl ? "admin-field-error" : undefined}>{errors.googleMapsUrl ?? "Chấp nhận google.com/maps, maps.google.com, maps.app.goo.gl hoặc goo.gl/maps qua HTTPS."}</small>
      </label>
    </div>
    {errors.localizedCopy && <p className="admin-field-error" role="alert">{errors.localizedCopy}</p>}
  </fieldset>;
}
