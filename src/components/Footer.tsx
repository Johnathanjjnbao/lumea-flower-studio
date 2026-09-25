import { siteConfig } from "../config/siteConfig";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="section-shell footer-grid">
        <div className="footer-brand">
          <div className="footer-brand-lockup">
            <p className="footer-brand-meta">{siteConfig.descriptor} · {siteConfig.city}</p>
            <a className="footer-wordmark" href="#top">{siteConfig.brandName}</a>
          </div>
          <div className="footer-brand-message">
            <p>Hoa cho những điều<br />khó nói thành lời.</p>
            <span>Được kết bằng tay, được gửi đi bằng sự chăm chút.</span>
          </div>
        </div>
        <nav className="footer-nav" aria-label="Điều hướng cuối trang">
          <p>Khám phá</p>
          <a href="#best-sellers">Bộ sưu tập</a>
          <a href="#occasions">Theo dịp</a>
          <a href="#florist-choice">Florist&apos;s Choice</a>
          <a href="#custom">Đặt hoa riêng</a>
        </nav>
        <div className="footer-contact">
          <p>Liên hệ</p>
          <a href={siteConfig.phoneHref}>{siteConfig.phoneDisplay}</a>
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          <a href="#gallery">Instagram</a>
        </div>
        <div className="footer-bottom">
          <span>© {siteConfig.year} {siteConfig.brandDisplayName} Flower Studio</span>
          <span>Handcrafted daily in {siteConfig.city}</span>
        </div>
      </div>
    </footer>
  );
}
