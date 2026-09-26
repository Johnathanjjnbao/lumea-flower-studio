import { AssetImage } from "../components/AssetImage";
import { siteConfig } from "../config/siteConfig";
import { useI18n } from "../i18n";

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="hero section-shell" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow hero-brand-kicker">
          <span className="brand-monogram" aria-hidden="true">{siteConfig.monogram}</span>
          <strong>{t.home.hero.kicker}</strong>
          <small>{t.brand.city}</small>
        </p>
        <h1 id="hero-title">{t.home.hero.titleOne}<br />{t.home.hero.titleTwo}</h1>
        <p className="hero-intro">{t.home.hero.intro}</p>
        <div className="hero-actions">
          <a className="button button--solid" href="#best-sellers">{t.home.hero.collectionCta}</a>
          <a className="button button--outline" href="#custom">{t.home.hero.customCta}</a>
        </div>
        <div className="hero-commerce">
          <span className="botanical-hairline" aria-hidden="true" />
          <p>{t.home.hero.commerceBefore} <strong>450.000đ</strong> · {t.home.hero.commerceAfter}</p>
        </div>
      </div>

      <div className="hero-media" aria-label={t.home.hero.mediaAria}>
        <figure className="hero-image hero-image--main">
          <AssetImage asset="heroMain" alt={t.home.hero.mainAlt} fetchPriority="high" />
        </figure>
        <figure className="hero-image hero-image--detail">
          <AssetImage asset="heroDetail" alt={t.home.hero.detailAlt} />
        </figure>
        <p className="hero-caption"><span>01</span> {t.home.hero.captionOne}<br />{t.home.hero.captionTwo}</p>
      </div>
    </section>
  );
}
