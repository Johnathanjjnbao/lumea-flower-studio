import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    const pathChanged = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;

    if (!location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (pathChanged) {
        const frame = window.requestAnimationFrame(() => {
          document.getElementById("main-content")?.focus({ preventScroll: true });
        });
        return () => window.cancelAnimationFrame(frame);
      }
      return;
    }

    let frame = 0;
    let observer: MutationObserver | null = null;
    let timeout = 0;
    let id = location.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* Ignore malformed URL escapes. */ }
    const scrollToTarget = () => {
      const target = document.getElementById(id);
      if (!target) return false;
      observer?.disconnect();
      window.clearTimeout(timeout);
      frame = window.requestAnimationFrame(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: pathChanged || reduceMotion ? "auto" : "smooth", block: "start" });
        if (target.matches("input, select, textarea, button, a[href], [tabindex]")) target.focus({ preventScroll: true });
      });
      return true;
    };
    if (!scrollToTarget()) {
      observer = new MutationObserver(scrollToTarget);
      observer.observe(document.body, { childList: true, subtree: true });
      timeout = window.setTimeout(() => observer?.disconnect(), 5000);
    }
    return () => {
      observer?.disconnect();
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [location.hash, location.pathname]);

  return null;
}
