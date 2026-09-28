import { ManagedImage } from "../components/ManagedImage";
import { siteConfig } from "../config/siteConfig";
import { resolveHomepageTarget } from "../features/homepage/cta";
import type { HomepageSection } from "../features/homepage/types";
import { useI18n } from "../i18n";

const galleryClasses = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const storyClasses = ["fresh", "handmade", "delivery"];

export function WhyLumea({ section }: { section: HomepageSection }) {
  const copy = section.copy;
  return <section className="why section-space" id="why-lumea" aria-labelledby="why-title"><div className="section-shell why-layout">
    <div className="why-heading"><p className="eyebrow"><span aria-hidden="true">08</span>{copy.eyebrow}</p><h2 id="why-title">{copy.titleOne}<br />{copy.titleTwo}</h2><p>{copy.body}</p></div>
    <div className="craft-stories">{section.features.map((story, index) => (
      <figure className={`craft-story craft-story--${storyClasses[index] ?? "fresh"}`} key={story.id}><div className="craft-story__image">{story.media && <ManagedImage src={story.media.url} alt={story.media.altText} loading="lazy" />}</div><figcaption><span>{story.label}</span><h3>{story.title}</h3><p>{story.body}</p></figcaption></figure>
    ))}</div>
  </div></section>;
}

export function Gallery({ section }: { section: HomepageSection }) {
  const { path } = useI18n();
  const copy = section.copy;
  return <section className="gallery section-space section-shell" id="gallery" aria-labelledby="gallery-title">
    <div className="section-heading section-heading--row gallery-heading"><div><p className="eyebrow"><span aria-hidden="true">09</span>{copy.eyebrow}</p><span className="botanical-hairline" aria-hidden="true" /><h2 id="gallery-title">{copy.titleOne}<br /><em>{copy.titleTwo}</em></h2></div><a className="text-link" href={resolveHomepageTarget(section.primaryCtaTarget, path)}>{copy.primaryCtaLabel} {siteConfig.instagramHandle}</a></div>
    <div className="gallery-grid">{section.media.map((media, index) => <figure className={`gallery-item gallery-item--${galleryClasses[index] ?? "ten"}`} key={media.id}><ManagedImage src={media.url} alt={media.altText} loading="lazy" />{media.caption && <figcaption>{media.caption}</figcaption>}</figure>)}</div>
  </section>;
}

export function Visit({ section }: { section: HomepageSection }) {
  const { t } = useI18n();
  const copy = section.copy;
  return <section className="visit section-space" id="visit" aria-labelledby="visit-title"><div className="section-shell visit-layout">
    <div className="visit-copy"><p className="eyebrow eyebrow--light"><span aria-hidden="true">10</span>{copy.eyebrow}</p><h2 id="visit-title">{copy.titleOne}</h2><p className="visit-lead">{copy.body}</p><dl className="visit-details">
      <div><dt>{copy.detailOneLabel}</dt><dd>{copy.detailOneValue}</dd></div><div><dt>{copy.detailTwoLabel}</dt><dd>{copy.detailTwoValue}</dd></div><div><dt>{t.home.visit.phone}</dt><dd><a href={siteConfig.phoneHref}>{siteConfig.phoneDisplay}</a></dd></div><div><dt>{t.home.visit.instagram}</dt><dd><a href="#gallery">{siteConfig.instagramHandle}</a></dd></div>
    </dl></div>
    <div className="map-placeholder" aria-label={t.home.visit.mapAria}><span className="map-district" aria-hidden="true">{t.home.visit.district}</span><div className="map-lines" aria-hidden="true"><span className="map-road map-road--one" /><span className="map-road map-road--two" /><span className="map-road map-road--three" /><span className="map-water" /></div><div className="map-pin" aria-hidden="true"><span>{siteConfig.monogram}</span></div><p>{siteConfig.brandDisplayName} {t.brand.descriptor}<br /><small>{t.home.visit.mapNote}</small></p></div>
  </div></section>;
}
