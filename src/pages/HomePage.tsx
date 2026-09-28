import { useRef } from "react";
import { PageFrame } from "../components/PageFrame";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useHomeMotion } from "../hooks/useHomeMotion";
import { useImagePipeline } from "../hooks/useImagePipeline";
import { BestSellers, Budget, Occasions } from "../sections/DiscoverySections";
import { Hero } from "../sections/Hero";
import { CustomBouquet, FloristChoice, SameDay } from "../sections/ServiceSections";
import { Gallery, Visit, WhyLumea } from "../sections/StorySections";
import { useHomepageContent } from "../features/homepage/useHomepageContent";
import { useI18n } from "../i18n";

export function HomePage() {
  const { locale, t } = useI18n();
  const homepage = useHomepageContent(locale);
  const pageRef = useRef<HTMLDivElement>(null);
  useImagePipeline(pageRef, {
    prioritySelector: ".hero, #occasions .occasion-tile:nth-child(-n + 3), #best-sellers .product-card:first-child",
    progressiveSelector: "#gallery",
    progressiveMargin: "320px 0px",
    refreshKey: homepage.status === "success" ? `${locale}:ready` : `${locale}:${homepage.status}`,
  });
  useHomeMotion(pageRef, homepage.status === "success" ? `${locale}:ready` : `${locale}:${homepage.status}`);
  useDocumentMetadata(
    t.meta.homeTitle,
    t.meta.homeDescription,
  );

  if (homepage.status === "loading") {
    return <PageFrame pageRef={pageRef}><section className="home-data-state home-data-state--loading" aria-busy="true" aria-label={t.catalog.loading}><div className="section-shell"><div className="home-data-state__copy catalog-skeleton" /><div className="home-data-state__media catalog-skeleton" /></div></section></PageFrame>;
  }

  if (homepage.status === "error") {
    return <PageFrame pageRef={pageRef}><section className="home-data-state"><div className="section-shell"><p className="eyebrow">LUMÉA · HOME</p><h1>{t.catalog.errorTitle}</h1><p>{t.catalog.errorText}</p><button className="button button--solid" type="button" onClick={homepage.retry}>{t.catalog.retry}</button></div></section></PageFrame>;
  }

  const { sections, featuredProducts } = homepage.data;

  return (
    <PageFrame pageRef={pageRef}>
      {sections.hero && <Hero section={sections.hero} />}
      {sections.occasions && <Occasions section={sections.occasions} />}
      {sections.best_sellers && <BestSellers section={sections.best_sellers} products={featuredProducts} />}
      {sections.budget && <Budget section={sections.budget} />}
      {sections.same_day && <SameDay section={sections.same_day} />}
      {sections.florist_choice && <FloristChoice section={sections.florist_choice} />}
      {sections.create_bouquet && <CustomBouquet section={sections.create_bouquet} />}
      {sections.why_lumea && <WhyLumea section={sections.why_lumea} />}
      {sections.gallery && <Gallery section={sections.gallery} />}
      {sections.visit && <Visit section={sections.visit} />}
    </PageFrame>
  );
}
