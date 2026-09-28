import { ManagedImage } from "../components/ManagedImage";
import { siteConfig } from "../config/siteConfig";
import { resolveHomepageTarget } from "../features/homepage/cta";
import { mediaBySlot, type HomepageSection } from "../features/homepage/types";
import { useI18n } from "../i18n";

export function Hero({ section }: { section: HomepageSection }) {
  const { t, path } = useI18n();
  const mainImage = mediaBySlot(section, "hero-main");
  const detailImage = mediaBySlot(section, "hero-detail");
  const copy = section.copy;
  return (
    <section className="hero section-shell" id="top" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow hero-brand-kicker">
          <span className="brand-monogram" aria-hidden="true">{siteConfig.monogram}</span>
          <strong>{copy.eyebrow}</strong>
          <small>{t.brand.city}</small>
        </p>
        <h1 id="hero-title">{copy.titleOne}<br />{copy.titleTwo}</h1>
        <p className="hero-intro">{copy.body}</p>
        <div className="hero-actions">
          <a className="button button--solid" href={resolveHomepageTarget(section.primaryCtaTarget, path)}>{copy.primaryCtaLabel}</a>
          <a className="button button--outline" href={resolveHomepageTarget(section.secondaryCtaTarget, path)}>{copy.secondaryCtaLabel}</a>
        </div>
        <div className="hero-commerce">
          <span className="botanical-hairline" aria-hidden="true" />
          <p>{copy.detailOneLabel} <strong>{copy.detailOneValue}</strong> · {copy.detailTwoLabel}</p>
        </div>
      </div>

      <div className="hero-media" aria-label={mainImage?.altText || t.home.hero.mediaAria}>
        <figure className="hero-image hero-image--main">
          {mainImage && <ManagedImage src={mainImage.url} alt={mainImage.altText} fetchPriority="high" />}
        </figure>
        <figure className="hero-image hero-image--detail">
          {detailImage && <ManagedImage src={detailImage.url} alt={detailImage.altText} />}
        </figure>
        <p className="hero-caption"><span>01</span> {mainImage?.caption}</p>
      </div>
    </section>
  );
}
