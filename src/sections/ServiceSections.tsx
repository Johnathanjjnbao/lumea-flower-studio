import { Link } from "react-router-dom";
import { AssetImage } from "../components/AssetImage";
import { usePrototypeAction } from "../context/PrototypeActionContext";
import { useI18n } from "../i18n";

export function SameDay() {
  const { t, path } = useI18n();
  return (
    <section className="same-day section-space section-shell" id="same-day" aria-labelledby="same-day-title">
      <div className="same-day-copy">
        <p className="eyebrow"><span aria-hidden="true">05</span>{t.home.sameDay.eyebrow}</p>
        <h2 id="same-day-title">{t.home.sameDay.titleOne}<br />{t.home.sameDay.titleTwo}</h2>
        <p>{t.home.sameDay.intro}</p>
        <div className="same-day-note">
          <span className="status-dot" aria-hidden="true" />
          <span>{t.home.sameDay.note}</span>
        </div>
        <Link className="button button--dark" to={path("/flowers?sameDay=true")}>{t.home.sameDay.cta}</Link>
      </div>
      <figure className="same-day-image">
        <AssetImage asset="deliveryReady" alt={t.home.sameDay.imageAlt} loading="lazy" />
        <figcaption>{t.home.sameDay.caption}</figcaption>
      </figure>
    </section>
  );
}

export function FloristChoice() {
  const { t } = useI18n();
  return (
    <section className="florist-choice section-space" id="florist-choice" aria-labelledby="florist-title">
      <div className="section-shell florist-layout">
        <figure className="florist-image">
          <AssetImage asset="studioTable" alt={t.home.florist.imageAlt} loading="lazy" />
          <figcaption>{t.home.florist.imageCaption}</figcaption>
        </figure>
        <div className="florist-copy">
          <p className="eyebrow eyebrow--light"><span aria-hidden="true">06</span>{t.home.florist.eyebrow}</p>
          <span className="botanical-hairline botanical-hairline--light" aria-hidden="true" />
          <h2 id="florist-title">{t.home.florist.titleOne}<br /><em>{t.home.florist.titleTwo}</em></h2>
          <p className="florist-intro">{t.home.florist.intro}</p>
          <div className="florist-brief" aria-label={t.home.florist.briefAria}>
            <div className="florist-brief__head"><span>{t.home.florist.brief}</span><span>{t.home.florist.interprets}</span></div>
            <dl className="florist-brief__grid">
              <div className="brief-field brief-field--budget">
                <dt>{t.home.florist.budget}</dt><dd><span className="brief-price">650–900k</span></dd>
              </div>
              <div className="brief-field brief-field--tone">
                <dt>{t.home.florist.tone}</dt>
                <dd className="tone-swatches" aria-label={t.home.florist.toneAria}>
                  <span className="tone-swatch tone-swatch--blush" title="Blush" />
                  <span className="tone-swatch tone-swatch--ivory" title="Ivory" />
                  <span className="tone-swatch tone-swatch--sage" title="Sage" />
                </dd>
              </div>
              <div className="brief-field brief-field--occasion">
                <dt>{t.home.florist.occasion}</dt><dd><span className="brief-tag">{t.home.florist.birthday}</span><span className="brief-tag">{t.home.florist.anniversary}</span></dd>
              </div>
            </dl>
            <p className="florist-brief__note">{t.home.florist.note}</p>
          </div>
          <a className="button button--light" href="#florist-choice">{t.home.florist.cta}</a>
        </div>
      </div>
    </section>
  );
}

export function CustomBouquet() {
  const { t } = useI18n();
  const { showPrototypeAction } = usePrototypeAction();

  return (
    <section className="custom section-space section-shell" id="custom" aria-labelledby="custom-title">
      <figure className="custom-image">
        <AssetImage asset="studioFlorist" alt={t.home.custom.imageAlt} loading="lazy" />
        <figcaption>{t.home.custom.imageCaption}</figcaption>
      </figure>
      <div className="custom-copy">
        <p className="eyebrow"><span aria-hidden="true">07</span>{t.home.custom.eyebrow}</p>
        <span className="botanical-hairline" aria-hidden="true" />
        <h2 id="custom-title">{t.home.custom.titleOne}<br />{t.home.custom.titleTwo}</h2>
        <p className="custom-intro">{t.home.custom.intro}</p>

        <div className="bouquet-builder" aria-label={t.home.custom.builderAria}>
          <div className="bouquet-builder__head">
            <div><p className="custom-path__label">{t.home.custom.selfLabel}</p><h3>{t.home.custom.builderTitle}</h3></div>
            <span className="builder-status">{t.home.custom.builderStatus}</span>
          </div>
          <div className="flower-picks" aria-label={t.home.custom.flowersAria}>
            <figure className="flower-pick">
              <AssetImage asset="detailRose" alt={t.home.custom.roseAlt} loading="lazy" />
              <figcaption><span>{t.home.custom.flowerNames[0]}</span><strong>× 5</strong></figcaption>
            </figure>
            <figure className="flower-pick">
              <AssetImage asset="detailCalla" alt={t.home.custom.callaAlt} loading="lazy" />
              <figcaption><span>{t.home.custom.flowerNames[1]}</span><strong>× 3</strong></figcaption>
            </figure>
            <figure className="flower-pick">
              <AssetImage asset="detailWhiteRose" alt={t.home.custom.whiteRoseAlt} loading="lazy" />
              <figcaption><span>{t.home.custom.flowerNames[2]}</span><strong>× 2</strong></figcaption>
            </figure>
          </div>
          <div className="wrapping-choice">
            <div><span className="builder-label">{t.home.custom.wrapping}</span><p>{t.home.custom.wrappingText}</p></div>
            <div className="wrapping-swatches" aria-label={t.home.custom.wrappingAria}>
              <span><i className="wrap-swatch wrap-swatch--ivory" />{t.home.custom.wrappingNames[0]}</span>
              <span><i className="wrap-swatch wrap-swatch--kraft" />{t.home.custom.wrappingNames[1]}</span>
              <span><i className="wrap-swatch wrap-swatch--blush" />{t.home.custom.wrappingNames[2]}</span>
            </div>
          </div>
          <button className="button button--solid" type="button" onClick={() => showPrototypeAction(t.home.custom.builderTitle)}>{t.home.custom.cta}</button>
        </div>

        <aside className="custom-assist">
          <div>
            <p className="custom-path__label">{t.home.custom.assistLabel}</p>
            <h3>{t.home.custom.assistTitle}</h3>
            <p>{t.home.custom.assistText}</p>
          </div>
          <a className="text-link" href="#florist-choice">{t.home.custom.assistCta}</a>
        </aside>
      </div>
    </section>
  );
}
