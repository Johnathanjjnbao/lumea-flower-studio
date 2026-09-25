import type { ReactNode, RefObject } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

interface PageFrameProps {
  children: ReactNode;
  pageRef?: RefObject<HTMLDivElement | null>;
}

export function PageFrame({ children, pageRef }: PageFrameProps) {
  return (
    <div ref={pageRef}>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
}
