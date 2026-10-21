import type { ReactNode, RefObject } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { reviewMode } from "../review/mode";
import { useI18n } from "../i18n";

interface PageFrameProps {
  children: ReactNode;
  pageRef?: RefObject<HTMLDivElement | null>;
}

export function PageFrame({ children, pageRef }: PageFrameProps) {
  const { locale } = useI18n();
  return (
    <div ref={pageRef}>
      {reviewMode && <div className="review-ribbon" role="note" data-review-mode="true">
        {locale === "vi"
          ? "LUMÉA — BẢN XEM TRƯỚC / REVIEW DEMO · Sản phẩm, giá và hình ảnh chỉ minh họa. Không tạo đơn hay thanh toán thật."
          : "LUMÉA — 미리보기 / REVIEW DEMO · 상품, 가격, 이미지는 예시입니다. 실제 주문이나 결제는 진행되지 않습니다."}
      </div>}
      <Header />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
    </div>
  );
}
