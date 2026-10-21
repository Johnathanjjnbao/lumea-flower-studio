import { useState } from "react";
import type { AdminHomepageMedia, AdminHomepageSection } from "../types";

interface HomepageMediaPanelProps {
  section: AdminHomepageSection;
  availableSlots: Array<{ key: string; label: string }>;
  onCopyChange: (media: AdminHomepageMedia) => void;
  onSaveCopy: (media: AdminHomepageMedia) => Promise<void>;
  onUpload: (slotKey: string, file: File, copy: { viAlt: string; koAlt: string; viCaption?: string; koCaption?: string }, sortOrder?: number) => Promise<void>;
  onMove?: (mediaId: string, direction: -1 | 1) => Promise<void>;
  onRemove?: (mediaId: string) => Promise<void>;
  gallery?: boolean;
}

export function HomepageMediaPanel({ section, availableSlots, onCopyChange, onSaveCopy, onUpload, onMove, onRemove, gallery = false }: HomepageMediaPanelProps) {
  const [newViAlt, setNewViAlt] = useState("");
  const [newKoAlt, setNewKoAlt] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const visibleMedia = section.media.filter((media) => media.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const missingSlots = availableSlots.filter((slot) => !visibleMedia.some((media) => media.slotKey === slot.key));
  const nextSlot = missingSlots.some((slot) => slot.key === selectedSlot) ? selectedSlot : missingSlots[0]?.key;

  const upload = async (slotKey: string, file: File, media?: AdminHomepageMedia) => {
    setBusy(slotKey);
    try {
      await onUpload(slotKey, file, {
        viAlt: media?.viAlt || newViAlt,
        koAlt: media?.koAlt || newKoAlt,
        viCaption: media?.viCaption,
        koCaption: media?.koCaption,
      }, media?.sortOrder ?? visibleMedia.length * 10);
      setNewViAlt("");
      setNewKoAlt("");
    } finally { setBusy(null); }
  };

  return <div className="admin-home-media">
    <div className="admin-home-media__grid">
      {visibleMedia.map((media, index) => <article className="admin-home-media__card" key={media.id}>
        <img src={media.url} alt="" />
        <div className="admin-home-media__body">
          <strong>{media.slotKey}</strong>
          <label>Alt — VI<input value={media.viAlt} onChange={(event) => onCopyChange({ ...media, viAlt: event.target.value })} /></label>
          <label>Alt — KO<input value={media.koAlt} onChange={(event) => onCopyChange({ ...media, koAlt: event.target.value })} /></label>
          <label>Caption — VI<input value={media.viCaption} onChange={(event) => onCopyChange({ ...media, viCaption: event.target.value })} /></label>
          <label>Caption — KO<input value={media.koCaption} onChange={(event) => onCopyChange({ ...media, koCaption: event.target.value })} /></label>
          <div className="admin-home-media__actions">
            <button type="button" onClick={() => void onSaveCopy(media)}>Lưu alt/caption</button>
            {gallery && <><button type="button" disabled={index === 0} onClick={() => void onMove?.(media.id, -1)}>↑</button><button type="button" disabled={index === visibleMedia.length - 1} onClick={() => void onMove?.(media.id, 1)}>↓</button><button type="button" onClick={() => void onRemove?.(media.id)}>Gỡ</button></>}
          </div>
          <label className="admin-file-input">{busy === media.slotKey ? "Đang tải…" : "Thay ảnh"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy !== null} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(media.slotKey, file, media); event.target.value = ""; }} /></label>
        </div>
      </article>)}
    </div>
    {(gallery ? visibleMedia.length < 10 : missingSlots.length > 0) && <div className="admin-upload-panel">
      <h3>{gallery ? "Thêm ảnh Gallery" : "Thêm ảnh cho section"}</h3><p>{gallery ? "Layout hiện hỗ trợ tối đa 10 ảnh. Ảnh cũ chỉ được gỡ relation, không bị xoá khỏi Storage." : "Chọn đúng vị trí ảnh. Ảnh mới được lưu riêng; không ghi đè file cũ."}</p>
      {!gallery && <label>Vị trí ảnh<select value={nextSlot ?? ""} onChange={(event) => setSelectedSlot(event.target.value)}>{missingSlots.map((slot) => <option value={slot.key} key={slot.key}>{slot.label}</option>)}</select></label>}
      <div className="admin-field-grid"><label>Alt — VI<input value={newViAlt} onChange={(event) => setNewViAlt(event.target.value)} /></label><label>Alt — KO<input value={newKoAlt} onChange={(event) => setNewKoAlt(event.target.value)} /></label></div>
      <label className="admin-file-input">{busy ? "Đang tải…" : "Chọn ảnh để thêm"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy !== null || !newViAlt.trim() || !newKoAlt.trim() || (!gallery && !nextSlot)} onChange={(event) => { const file = event.target.files?.[0]; if (file && (gallery || nextSlot)) void upload(gallery ? `gallery-${crypto.randomUUID()}` : nextSlot!, file); event.target.value = ""; }} /></label>
      <small>JPEG, PNG, WebP hoặc AVIF. Alt VI/KO là bắt buộc.</small>
    </div>}
  </div>;
}
