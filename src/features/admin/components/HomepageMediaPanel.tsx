import { useState } from "react";
import type { AdminHomepageMedia, AdminHomepageSection } from "../types";

interface HomepageMediaPanelProps {
  section: AdminHomepageSection;
  onCopyChange: (media: AdminHomepageMedia) => void;
  onSaveCopy: (media: AdminHomepageMedia) => Promise<void>;
  onUpload: (slotKey: string, file: File, copy: { viAlt: string; koAlt: string; viCaption?: string; koCaption?: string }, sortOrder?: number) => Promise<void>;
  onMove?: (mediaId: string, direction: -1 | 1) => Promise<void>;
  onRemove?: (mediaId: string) => Promise<void>;
  gallery?: boolean;
}

export function HomepageMediaPanel({ section, onCopyChange, onSaveCopy, onUpload, onMove, onRemove, gallery = false }: HomepageMediaPanelProps) {
  const [newViAlt, setNewViAlt] = useState("");
  const [newKoAlt, setNewKoAlt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const visibleMedia = section.media.filter((media) => media.active).sort((a, b) => a.sortOrder - b.sortOrder);

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
    {gallery && visibleMedia.length < 10 && <div className="admin-upload-panel">
      <h3>Thêm ảnh Gallery</h3><p>Layout hiện hỗ trợ tối đa 10 ảnh. Ảnh cũ chỉ được gỡ relation, không bị xoá khỏi Storage.</p>
      <div className="admin-field-grid"><label>Alt — VI<input value={newViAlt} onChange={(event) => setNewViAlt(event.target.value)} /></label><label>Alt — KO<input value={newKoAlt} onChange={(event) => setNewKoAlt(event.target.value)} /></label></div>
      <label className="admin-file-input">{busy ? "Đang tải…" : "Chọn ảnh để thêm"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy !== null || !newViAlt.trim() || !newKoAlt.trim()} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(`gallery-${crypto.randomUUID()}`, file); event.target.value = ""; }} /></label>
      <small>JPEG, PNG, WebP hoặc AVIF. Alt VI/KO là bắt buộc.</small>
    </div>}
  </div>;
}
