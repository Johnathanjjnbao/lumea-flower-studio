import { useRef } from "react";
import { PageFrame } from "../components/PageFrame";
import { useDocumentMetadata } from "../hooks/useDocumentMetadata";
import { useHomeMotion } from "../hooks/useHomeMotion";
import { useImagePipeline } from "../hooks/useImagePipeline";
import { BestSellers, Budget, Occasions } from "../sections/DiscoverySections";
import { Hero } from "../sections/Hero";
import { CustomBouquet, FloristChoice, SameDay } from "../sections/ServiceSections";
import { Gallery, Visit, WhyLumea } from "../sections/StorySections";

export function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  useImagePipeline(pageRef);
  useHomeMotion(pageRef);
  useDocumentMetadata(
    "Luméa Flower Studio — Hoa cho những điều khó nói thành lời",
    "Luméa Flower Studio — hoa được kết bằng tay tại Sài Gòn cho những điều khó nói thành lời.",
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
