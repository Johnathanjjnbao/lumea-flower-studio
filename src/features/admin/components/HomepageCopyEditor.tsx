import { useState } from "react";
import type { HomepageSectionCopy, HomepageSectionKey } from "../../homepage/types";
import type { AdminHomepageSection } from "../types";

const labels: Record<keyof HomepageSectionCopy, string> = {
  eyebrow: "Nhãn mở đầu", titleOne: "Tiêu đề — dòng 1", titleTwo: "Tiêu đề — dòng 2", body: "Đoạn giới thiệu", note: "Ghi chú / empty state",
  primaryCtaLabel: "CTA chính", secondaryCtaLabel: "CTA phụ", secondaryHeading: "Tiêu đề phụ", secondaryBody: "Nội dung phụ",
  detailOneLabel: "Chi tiết 1 — nhãn", detailOneValue: "Chi tiết 1 — giá trị", detailTwoLabel: "Chi tiết 2 — nhãn", detailTwoValue: "Chi tiết 2 — giá trị",
};

const fieldsBySection: Record<HomepageSectionKey, Array<keyof HomepageSectionCopy>> = {
  hero: ["eyebrow", "titleOne", "titleTwo", "body", "primaryCtaLabel", "secondaryCtaLabel", "detailOneLabel", "detailOneValue", "detailTwoLabel"],
  occasions: ["eyebrow", "titleOne", "titleTwo", "body"],
  best_sellers: ["eyebrow", "titleOne", "titleTwo", "primaryCtaLabel", "note"],
  budget: ["eyebrow", "titleOne", "titleTwo", "body"],
  same_day: ["eyebrow", "titleOne", "titleTwo", "body", "note", "primaryCtaLabel"],
  florist_choice: ["eyebrow", "titleOne", "titleTwo", "body", "primaryCtaLabel"],
  create_bouquet: ["eyebrow", "titleOne", "titleTwo", "body", "primaryCtaLabel", "secondaryHeading", "secondaryBody", "secondaryCtaLabel"],
  why_lumea: ["eyebrow", "titleOne", "titleTwo", "body"],
  gallery: ["eyebrow", "titleOne", "titleTwo", "primaryCtaLabel"],
  visit: ["eyebrow", "titleOne", "body", "secondaryHeading", "detailOneLabel", "detailOneValue", "detailTwoLabel", "detailTwoValue", "primaryCtaLabel"],
};

const visitLabels: Partial<Record<keyof HomepageSectionCopy, string>> = {
  secondaryHeading: "Tên studio hiển thị tại vị trí",
  detailOneLabel: "Nhãn địa chỉ",
  detailOneValue: "Địa chỉ studio",
  detailTwoLabel: "Nhãn giờ mở cửa",
  detailTwoValue: "Giờ mở cửa",
  primaryCtaLabel: "Nhãn nút chỉ đường",
};

const multiline = new Set<keyof HomepageSectionCopy>(["body", "note", "secondaryBody"]);

export function HomepageCopyEditor({ section, onChange }: { section: AdminHomepageSection; onChange: (section: AdminHomepageSection) => void }) {
  const [locale, setLocale] = useState<"vi" | "ko">("vi");
  const copy = section[locale];
  const update = (field: keyof HomepageSectionCopy, value: string) => onChange({ ...section, [locale]: { ...copy, [field]: value } });
  return <>
    <div className="admin-tabs" role="tablist" aria-label="Ngôn ngữ nội dung Homepage">
      <button type="button" role="tab" aria-selected={locale === "vi"} onClick={() => setLocale("vi")}>Tiếng Việt</button>
      <button type="button" role="tab" aria-selected={locale === "ko"} onClick={() => setLocale("ko")}>한국어</button>
    </div>
    <div className="admin-field-grid">
      {fieldsBySection[section.key].map((field) => <label className={multiline.has(field) ? "admin-field-span" : undefined} key={field}>
        {section.key === "visit" ? visitLabels[field] ?? labels[field] : labels[field]}
        {multiline.has(field)
          ? <textarea rows={field === "body" ? 4 : 3} value={copy[field]} onChange={(event) => update(field, event.target.value)} />
          : <input value={copy[field]} onChange={(event) => update(field, event.target.value)} />}
      </label>)}
    </div>
  </>;
}
