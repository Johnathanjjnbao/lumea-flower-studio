import { AssetImage } from "../components/AssetImage";
import { siteConfig } from "../config/siteConfig";

export function Hero() {
  return (
    <section className="hero section-shell" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow hero-brand-kicker">
          <span className="brand-monogram" aria-hidden="true">{siteConfig.monogram}</span>
          <strong>Handcrafted florals</strong>
          <small>{siteConfig.city}</small>
        </p>
        <h1 id="hero-title">Hoa cho những điều<br />khó nói thành lời.</h1>
        <p className="hero-intro">
          Được kết bằng tay tại studio cho sinh nhật, tình yêu và những điều bạn muốn nói thật dịu dàng.
        </p>
        <div className="hero-actions">
          <a className="button button--solid" href="#best-sellers">Xem bộ sưu tập</a>
          <a className="button button--outline" href="#custom">Đặt hoa theo yêu cầu</a>
        </div>
        <div className="hero-commerce">
          <span className="botanical-hairline" aria-hidden="true" />
          <p>Bó hoa từ <strong>450.000đ</strong> · Giao trong ngày tại TP.HCM</p>
        </div>
      </div>

      <div className="hero-media" aria-label="Hoa tươi theo phong cách editorial">
        <figure className="hero-image hero-image--main">
          <AssetImage asset="heroMain" alt="Bó hoa hồng tươi mang sắc thái thanh lịch" fetchPriority="high" />
        </figure>
        <figure className="hero-image hero-image--detail">
          <AssetImage asset="heroDetail" alt="Chi tiết những cánh hoa mềm mại" />
        </figure>
        <p className="hero-caption"><span>01</span> Seasonal composition<br />in rose &amp; ivory</p>
      </div>
    </section>
  );
}
