import { Link } from "react-router-dom";
import { PageFrame } from "../components/PageFrame";
import { useI18n } from "../i18n";

export function ReviewNotFound() {
  const { locale, path } = useI18n();
  return <PageFrame><section className="review-admin-notice section-shell section-space">
    <p className="eyebrow">LUMÉA · REVIEW DEMO</p>
    <h1>{locale === "vi" ? "Không tìm thấy trang này" : "페이지를 찾을 수 없습니다"}</h1>
    <p>{locale === "vi" ? "Liên kết này không có trong bản xem trước." : "이 링크는 미리보기에 없습니다."}</p>
    <Link className="button button--solid" to={path("/")}>{locale === "vi" ? "Về trang chủ" : "홈으로 돌아가기"}</Link>
  </section></PageFrame>;
}
