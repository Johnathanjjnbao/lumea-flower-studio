import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { PageFrame } from "../components/PageFrame";

export function ReviewAdminNotice() {
  const { locale, path } = useI18n();
  return <PageFrame><section className="review-admin-notice section-shell section-space">
    <p className="eyebrow">LUMÉA · REVIEW MODE</p>
    <h1>{locale === "vi" ? "Admin không nằm trong bản demo offline" : "오프라인 데모에서는 관리자 기능을 사용할 수 없습니다"}</h1>
    <p>{locale === "vi"
      ? "Trang quản trị thật vẫn yêu cầu đăng nhập và quyền server-side. Bản xem trước không kết nối hoặc thay đổi dữ liệu cửa hàng."
      : "실제 관리자 화면은 로그인과 서버 권한 확인이 필요합니다. 이 미리보기는 매장 데이터에 연결하거나 변경하지 않습니다."}</p>
    <Link className="button button--solid" to={path("/")}>{locale === "vi" ? "Về trang chủ" : "홈으로 돌아가기"}</Link>
  </section></PageFrame>;
}
