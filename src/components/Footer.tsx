import { Link } from "react-router-dom";
import { siteConfig } from "../config/siteConfig";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="section-shell footer-grid">
        <div className="footer-brand">
          <div className="footer-brand-lockup">
            <p className="footer-brand-meta">{siteConfig.descriptor} · {siteConfig.city}</p>
            <Link className="footer-wordmark" to="/#top">{siteConfig.brandName}</Link>
          </div>
          <div className="footer-brand-message">
            <p>Hoa cho những điều<br />khó nói thành lời.</p>
            <span>Được kết bằng tay, được gửi đi bằng sự chăm chút.</span>
          </div>
        </div>
        <nav className="footer-nav" aria-label="Điều hướng cuối trang">
          <p>Khám phá</p>
          <Link to="/flowers">Bộ sưu tập</Link>
          <Link to="/#occasions">Theo dịp</Link>
          <Link to="/#florist-choice">Florist&apos;s Choice</Link>
          <Link to="/#custom">Đặt hoa riêng</Link>
        </nav>
        <div className="footer-contact">
          <p>Liên hệ</p>
          <a href={siteConfig.phoneHref}>{siteConfig.phoneDisplay}</a>
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          <Link to="/#gallery">Instagram</Link>
        </div>
        <div className="footer-bottom">
          <span>© {siteConfig.year} {siteConfig.brandDisplayName} Flower Studio</span>
          <span>Handcrafted daily in {siteConfig.city}</span>
        </div>
      </div>
    </footer>
  );
}
