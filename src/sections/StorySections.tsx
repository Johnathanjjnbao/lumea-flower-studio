import { AssetImage } from "../components/AssetImage";
import { siteConfig } from "../config/siteConfig";
import type { AssetKey } from "../data/assets";
import { useI18n } from "../i18n";

const storyAssets: Array<{ asset: AssetKey; className: string }> = [
  { asset: "flowerShop", className: "fresh" },
  { asset: "floristHands", className: "handmade" },
  { asset: "wrappingDetail", className: "delivery" },
];

const galleryAssets: AssetKey[] = ["galleryOne", "studioRibbon", "galleryThree", "galleryFour", "singleRose", "galleryFive", "customBouquet", "whyLumea", "galleryTwo", "gallerySix"];
const galleryClasses = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export function WhyLumea() {
  const { t } = useI18n();
  return <section className="why section-space" id="why-lumea" aria-labelledby="why-title"><div className="section-shell why-layout">
    <div className="why-heading"><p className="eyebrow"><span aria-hidden="true">08</span>{t.home.why.eyebrow}</p><h2 id="why-title">{t.home.why.titleOne}<br />{t.home.why.titleTwo}</h2><p>{t.home.why.intro}</p></div>
    <div className="craft-stories">{storyAssets.map(({ asset, className }, index) => {
      const story = t.home.why.stories[index];
      return <figure className={`craft-story craft-story--${className}`} key={asset}><div className="craft-story__image"><AssetImage asset={asset} alt={story.alt} loading="lazy" /></div><figcaption><span>{story.label}</span><h3>{story.title}</h3><p>{story.text}</p></figcaption></figure>;
    })}</div>
  </div></section>;
}

export function Gallery() {
  const { t } = useI18n();
  const captionByIndex: Record<number, string> = { 0: t.home.gallery.captions[0], 5: t.home.gallery.captions[1], 9: t.home.gallery.captions[2] };
  return <section className="gallery section-space section-shell" id="gallery" aria-labelledby="gallery-title">
    <div className="section-heading section-heading--row gallery-heading"><div><p className="eyebrow"><span aria-hidden="true">09</span>{t.home.gallery.eyebrow}</p><span className="botanical-hairline" aria-hidden="true" /><h2 id="gallery-title">{t.home.gallery.titleOne}<br /><em>{t.home.gallery.titleTwo}</em></h2></div><a className="text-link" href="#visit">{t.home.gallery.follow} {siteConfig.instagramHandle}</a></div>
    <div className="gallery-grid">{galleryAssets.map((asset, index) => <figure className={`gallery-item gallery-item--${galleryClasses[index]}`} key={asset}><AssetImage asset={asset} alt={t.home.gallery.alts[index]} loading="lazy" />{captionByIndex[index] && <figcaption>{captionByIndex[index]}</figcaption>}</figure>)}</div>
  </section>;
}

export function Visit() {
  const { t } = useI18n();
  return <section className="visit section-space" id="visit" aria-labelledby="visit-title"><div className="section-shell visit-layout">
    <div className="visit-copy"><p className="eyebrow eyebrow--light"><span aria-hidden="true">10</span>{t.home.visit.eyebrow}</p><h2 id="visit-title">{t.home.visit.title}</h2><p className="visit-lead">{t.home.visit.lead}</p><dl className="visit-details">
      <div><dt>{t.home.visit.address}</dt><dd>{t.home.visit.addressValue}</dd></div><div><dt>{t.home.visit.hours}</dt><dd>{t.home.visit.hoursValue}</dd></div><div><dt>{t.home.visit.phone}</dt><dd><a href={siteConfig.phoneHref}>{siteConfig.phoneDisplay}</a></dd></div><div><dt>{t.home.visit.instagram}</dt><dd><a href="#gallery">{siteConfig.instagramHandle}</a></dd></div>
    </dl></div>
    <div className="map-placeholder" aria-label={t.home.visit.mapAria}><span className="map-district" aria-hidden="true">{t.home.visit.district}</span><div className="map-lines" aria-hidden="true"><span className="map-road map-road--one" /><span className="map-road map-road--two" /><span className="map-road map-road--three" /><span className="map-water" /></div><div className="map-pin" aria-hidden="true"><span>{siteConfig.monogram}</span></div><p>{siteConfig.brandDisplayName} {t.brand.descriptor}<br /><small>{t.home.visit.mapNote}</small></p></div>
  </div></section>;
}
