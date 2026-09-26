import { AssetImage } from "../components/AssetImage";
import { siteConfig } from "../config/siteConfig";

export function WhyLumea() {
  return (
    <section className="why section-space" id="why-lumea" aria-labelledby="why-title">
      <div className="section-shell why-layout">
        <div className="why-heading">
          <p className="eyebrow"><span aria-hidden="true">08</span>Why Luméa</p>
          <h2 id="why-title">Từ bàn hoa<br />đến tận tay.</h2>
          <p>Tại Luméa, mỗi bó hoa được làm chậm rãi, cân nhắc và trao đi với sự chăm chút.</p>
        </div>
        <div className="craft-stories">
          <figure className="craft-story craft-story--fresh">
            <div className="craft-story__image"><AssetImage asset="flowerShop" alt="Những cành hoa tươi và lá xanh được chọn tại cửa hàng hoa" loading="lazy" /></div>
            <figcaption><span>Fresh daily</span><h3>Hoa được chọn mỗi ngày</h3><p>Theo mùa, theo sắc độ và theo vẻ đẹp tự nhiên nhất.</p></figcaption>
          </figure>
          <figure className="craft-story craft-story--handmade">
            <div className="craft-story__image"><AssetImage asset="floristHands" alt="Đôi tay florist đang sắp từng cành hoa thành một composition" loading="lazy" /></div>
            <figcaption><span>Made by hand</span><h3>Từng bó được kết bằng tay</h3><p>Cân chỉnh riêng để mỗi composition có nhịp điệu của mình.</p></figcaption>
          </figure>
          <figure className="craft-story craft-story--delivery">
            <div className="craft-story__image"><AssetImage asset="wrappingDetail" alt="Ribbon được buộc thủ công cho bó hoa trước khi giao" loading="lazy" /></div>
            <figcaption><span>Given with care</span><h3>Được trao đi như một món quà</h3><p>Giữ trọn hình dáng và cảm xúc từ studio đến người nhận.</p></figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

export function Gallery() {
  return (
    <section className="gallery section-space section-shell" id="gallery" aria-labelledby="gallery-title">
      <div className="section-heading section-heading--row gallery-heading">
        <div>
          <p className="eyebrow"><span aria-hidden="true">09</span>Studio journal</p>
          <span className="botanical-hairline" aria-hidden="true" />
          <h2 id="gallery-title">From our<br /><em>flower table</em></h2>
        </div>
        <a className="text-link" href="#visit">Theo dõi {siteConfig.instagramHandle}</a>
      </div>
      <div className="gallery-grid">
        <figure className="gallery-item gallery-item--one">
          <AssetImage asset="galleryOne" alt="Bó hoa rực rỡ chụp cận cảnh" loading="lazy" />
          <figcaption>Seasonal study · No. 09</figcaption>
        </figure>
        <figure className="gallery-item gallery-item--two"><AssetImage asset="galleryTwo" alt="Chi tiết một đóa hoa vàng trong nắng" loading="lazy" /></figure>
        <figure className="gallery-item gallery-item--three"><AssetImage asset="studioRibbon" alt="Florist đang đo ribbon trên bàn hoa" loading="lazy" /></figure>
        <figure className="gallery-item gallery-item--four"><AssetImage asset="galleryFour" alt="Chi tiết những cánh hoa trắng trong khu vườn" loading="lazy" /></figure>
        <figure className="gallery-item gallery-item--five"><AssetImage asset="galleryThree" alt="Bình hoa pastel được sắp tự nhiên trên bàn studio" loading="lazy" /></figure>
        <figure className="gallery-item gallery-item--six">
          <AssetImage asset="gallerySix" alt="Hoa và lá trong một khung hình editorial" loading="lazy" />
          <figcaption>From the studio · Saigon</figcaption>
        </figure>
        <figure className="gallery-item gallery-item--seven"><AssetImage asset="singleRose" alt="Florist đang điểm thêm hoa baby quanh một đóa hồng đỏ" loading="lazy" /></figure>
        <figure className="gallery-item gallery-item--eight"><AssetImage asset="galleryFive" alt="Những cành hoa tươi được sắp đặt tự nhiên" loading="lazy" /></figure>
        <figure className="gallery-item gallery-item--nine"><AssetImage asset="customBouquet" alt="Bó hoa đã gói đặt trên ghế, sẵn sàng được trao đi" loading="lazy" /></figure>
        <figure className="gallery-item gallery-item--ten">
          <AssetImage asset="whyLumea" alt="Bàn tay chạm nhẹ vào một composition hoa nhỏ trong studio" loading="lazy" />
          <figcaption>Hands, stems &amp; quiet details.</figcaption>
        </figure>
      </div>
    </section>
  );
}

export function Visit() {
  return (
    <section className="visit section-space" id="visit" aria-labelledby="visit-title">
      <div className="section-shell visit-layout">
        <div className="visit-copy">
          <p className="eyebrow eyebrow--light"><span aria-hidden="true">10</span>Visit the studio</p>
          <h2 id="visit-title">Ghé {siteConfig.brandDisplayName}</h2>
          <p className="visit-lead">Một góc nhỏ đầy hoa, nắng và những câu chuyện đang chờ được gửi trao.</p>
          <dl className="visit-details">
            <div><dt>Địa chỉ</dt><dd>TP.HCM · Thông tin demo</dd></div>
            <div><dt>Mở cửa</dt><dd>Mỗi ngày · 09:00 – 20:00</dd></div>
            <div><dt>Điện thoại</dt><dd><a href={siteConfig.phoneHref}>{siteConfig.phoneDisplay}</a></dd></div>
            <div><dt>Instagram</dt><dd><a href="#gallery">{siteConfig.instagramHandle}</a></dd></div>
          </dl>
        </div>
        <div className="map-placeholder" aria-label="Vị trí Google Maps sẽ được tích hợp sau">
          <div className="map-lines" aria-hidden="true">
            <span className="map-road map-road--one" /><span className="map-road map-road--two" /><span className="map-road map-road--three" /><span className="map-water" />
          </div>
          <div className="map-pin" aria-hidden="true"><span>{siteConfig.monogram}</span></div>
          <p>{siteConfig.brandDisplayName} Flower Studio<br /><small>Bản đồ minh hoạ</small></p>
        </div>
      </div>
    </section>
  );
}
