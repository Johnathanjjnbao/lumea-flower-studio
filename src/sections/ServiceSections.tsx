import { Link } from "react-router-dom";
import { AssetImage } from "../components/AssetImage";
import { usePrototypeAction } from "../context/PrototypeActionContext";

export function SameDay() {
  return (
    <section className="same-day section-space section-shell" id="same-day" aria-labelledby="same-day-title">
      <div className="same-day-copy">
        <p className="eyebrow"><span aria-hidden="true">05</span>For today · Saigon</p>
        <h2 id="same-day-title">Cần hoa<br />hôm nay?</h2>
        <p>Có. Một số thiết kế có thể được chuẩn bị và giao trong ngày tại khu vực áp dụng ở TP.HCM.</p>
        <div className="same-day-note">
          <span className="status-dot" aria-hidden="true" />
          <span>Đặt trước 14:00 · Xác nhận theo khu vực và mẫu hoa</span>
        </div>
        <Link className="button button--dark" to="/flowers?sameDay=true">Xem hoa giao trong ngày</Link>
      </div>
      <figure className="same-day-image">
        <AssetImage asset="deliveryReady" alt="Bó hoa hoàn thiện đang được cầm trên tay, sẵn sàng trao tặng" loading="lazy" />
        <figcaption>Wrapped at the studio · Ready to be given.</figcaption>
      </figure>
    </section>
  );
}

export function FloristChoice() {
  return (
    <section className="florist-choice section-space" id="florist-choice" aria-labelledby="florist-title">
      <div className="section-shell florist-layout">
        <figure className="florist-image">
          <AssetImage asset="studioTable" alt="Florist đang chọn và sắp từng cành hoa trên bàn studio" loading="lazy" />
          <figcaption>Luméa atelier · A composition begins at the flower table.</figcaption>
        </figure>
        <div className="florist-copy">
          <p className="eyebrow eyebrow--light"><span aria-hidden="true">06</span>Florist&apos;s Choice</p>
          <span className="botanical-hairline botanical-hairline--light" aria-hidden="true" />
          <h2 id="florist-title">Để florist<br /><em>chọn thay bạn.</em></h2>
          <p className="florist-intro">Chọn ngân sách, tone màu và dịp. Phần còn lại hãy để Luméa thực hiện.</p>
          <div className="florist-brief" aria-label="Minh hoạ brief dành cho florist">
            <div className="florist-brief__head"><span>Your brief</span><span>Florist interprets</span></div>
            <dl className="florist-brief__grid">
              <div className="brief-field brief-field--budget">
                <dt>Ngân sách</dt><dd><span className="brief-price">650–900k</span></dd>
              </div>
              <div className="brief-field brief-field--tone">
                <dt>Tone màu</dt>
                <dd className="tone-swatches" aria-label="Blush, ivory và sage">
                  <span className="tone-swatch tone-swatch--blush" title="Blush" />
                  <span className="tone-swatch tone-swatch--ivory" title="Ivory" />
                  <span className="tone-swatch tone-swatch--sage" title="Sage" />
                </dd>
              </div>
              <div className="brief-field brief-field--occasion">
                <dt>Dịp tặng</dt><dd><span className="brief-tag">Sinh nhật</span><span className="brief-tag">Kỷ niệm</span></dd>
              </div>
            </dl>
            <p className="florist-brief__note">Bạn chọn cảm xúc. Florist chọn những cành hoa đẹp nhất trong ngày.</p>
          </div>
          <a className="button button--light" href="#florist-choice">Khám phá Florist&apos;s Choice</a>
        </div>
      </div>
    </section>
  );
}

export function CustomBouquet() {
  const { showPrototypeAction } = usePrototypeAction();

  return (
    <section className="custom section-space section-shell" id="custom" aria-labelledby="custom-title">
      <figure className="custom-image">
        <AssetImage asset="studioFlorist" alt="Florist đang gói một bó hồng bằng giấy tại studio" loading="lazy" />
        <figcaption>One story · Two ways to create</figcaption>
      </figure>
      <div className="custom-copy">
        <p className="eyebrow"><span aria-hidden="true">07</span>Made-to-order · Theo cách bạn chọn</p>
        <span className="botanical-hairline" aria-hidden="true" />
        <h2 id="custom-title">Một bó hoa,<br />theo cách bạn muốn.</h2>
        <p className="custom-intro">Tự chọn từng chi tiết, hoặc kể chúng tôi nghe điều bạn muốn gửi trao.</p>

        <div className="bouquet-builder" aria-label="Minh hoạ cách tự tạo bó hoa">
          <div className="bouquet-builder__head">
            <div><p className="custom-path__label">Bạn tự chọn</p><h3>Tạo bó hoa của bạn</h3></div>
            <span className="builder-status">Your composition</span>
          </div>
          <div className="flower-picks" aria-label="Các loại hoa đã chọn">
            <figure className="flower-pick">
              <AssetImage asset="detailRose" alt="Một cành hồng garden màu blush" loading="lazy" />
              <figcaption><span>Garden Rose</span><strong>× 5</strong></figcaption>
            </figure>
            <figure className="flower-pick">
              <AssetImage asset="detailCalla" alt="Hoa calla hồng cùng lá xanh" loading="lazy" />
              <figcaption><span>Calla</span><strong>× 3</strong></figcaption>
            </figure>
            <figure className="flower-pick">
              <AssetImage asset="detailWhiteRose" alt="Một cành hồng trắng làm điểm sáng" loading="lazy" />
              <figcaption><span>White Rose</span><strong>× 2</strong></figcaption>
            </figure>
          </div>
          <div className="wrapping-choice">
            <div><span className="builder-label">Giấy gói</span><p>Chạm cuối cho composition của bạn.</p></div>
            <div className="wrapping-swatches" aria-label="Ba lựa chọn giấy gói">
              <span><i className="wrap-swatch wrap-swatch--ivory" />Ivory</span>
              <span><i className="wrap-swatch wrap-swatch--kraft" />Kraft</span>
              <span><i className="wrap-swatch wrap-swatch--blush" />Blush</span>
            </div>
          </div>
          <button className="button button--solid" type="button" onClick={() => showPrototypeAction("Tạo bó hoa của bạn")}>Tạo bó hoa của bạn</button>
        </div>

        <aside className="custom-assist">
          <div>
            <p className="custom-path__label">Muốn được chăm chút trọn vẹn?</p>
            <h3>Để Luméa thiết kế giúp</h3>
            <p>Chỉ cần chia sẻ dịp tặng, tone màu và cảm xúc.</p>
          </div>
          <a className="text-link" href="#florist-choice">Gửi brief cho florist</a>
        </aside>
      </div>
    </section>
  );
}
