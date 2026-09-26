import { useRef } from "react";
import { PageFrame } from "../components/PageFrame";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useHomeMotion } from "../hooks/useHomeMotion";
import { useImagePipeline } from "../hooks/useImagePipeline";
import { BestSellers, Budget, Occasions } from "../sections/DiscoverySections";
import { Hero } from "../sections/Hero";
import { CustomBouquet, FloristChoice, SameDay } from "../sections/ServiceSections";
import { Gallery, Visit, WhyLumea } from "../sections/StorySections";
import { useI18n } from "../i18n";

export function HomePage() {
  const { t } = useI18n();
  const pageRef = useRef<HTMLDivElement>(null);
  useImagePipeline(pageRef, {
    prioritySelector: ".hero, #occasions .occasion-tile:nth-child(-n + 3), #best-sellers .product-card:first-child",
    progressiveSelector: "#gallery",
    progressiveMargin: "320px 0px",
  });
  useHomeMotion(pageRef);
  useDocumentMetadata(
    t.meta.homeTitle,
    t.meta.homeDescription,
  );

  return (
    <PageFrame pageRef={pageRef}>
      <Hero />
      <Occasions />
      <BestSellers />
      <Budget />
      <SameDay />
      <FloristChoice />
      <CustomBouquet />
      <WhyLumea />
      <Gallery />
      <Visit />
    </PageFrame>
  );
}
