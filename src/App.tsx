import { useRef } from "react";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { PrototypeActionProvider } from "./context/PrototypeActionContext";
import { useHomeMotion } from "./hooks/useHomeMotion";
import { useImagePipeline } from "./hooks/useImagePipeline";
import { BestSellers, Budget, Occasions } from "./sections/DiscoverySections";
import { Hero } from "./sections/Hero";
import { CustomBouquet, FloristChoice, SameDay } from "./sections/ServiceSections";
import { Gallery, Visit, WhyLumea } from "./sections/StorySections";

export default function App() {
  const pageRef = useRef<HTMLDivElement>(null);
  useImagePipeline(pageRef);
  useHomeMotion(pageRef);

  return (
    <PrototypeActionProvider>
      <div ref={pageRef}>
        <Header />
        <main id="main-content">
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
        </main>
        <Footer />
      </div>
    </PrototypeActionProvider>
  );
}
