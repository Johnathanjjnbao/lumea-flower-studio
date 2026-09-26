import { useCallback, useEffect, useState, type RefObject } from "react";

export type BuilderStepId = "flowers" | "wrapping" | "preview";

interface BuilderStepTarget {
  id: BuilderStepId;
  ref: RefObject<HTMLElement | null>;
}

export function useBuilderStepNavigation(targets: readonly BuilderStepTarget[]) {
  const [activeStep, setActiveStep] = useState<BuilderStepId>("flowers");

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const mobileQuery = window.matchMedia("(max-width: 1099px)");
    let observer: IntersectionObserver | null = null;

    const observeTargets = () => {
      observer?.disconnect();
      const visibleTargets = mobileQuery.matches ? targets : targets.filter(({ id }) => id !== "preview");
      observer = new IntersectionObserver(() => {
        const activationLine = Math.min(180, window.innerHeight * 0.28);
        const current = visibleTargets
          .map(({ id, ref }) => ({ id, element: ref.current }))
          .filter((target): target is { id: BuilderStepId; element: HTMLElement } => Boolean(target.element))
          .filter(({ element }) => {
            const rect = element.getBoundingClientRect();
            return rect.bottom > activationLine && rect.top < window.innerHeight * 0.78;
          })
          .sort((a, b) => Math.abs(a.element.getBoundingClientRect().top - activationLine) - Math.abs(b.element.getBoundingClientRect().top - activationLine))[0];
        if (current) setActiveStep(current.id);
      }, { rootMargin: "-18% 0px -55% 0px", threshold: [0, 0.01] });
      visibleTargets.forEach(({ ref }) => { if (ref.current) observer?.observe(ref.current); });
    };

    observeTargets();
    mobileQuery.addEventListener("change", observeTargets);
    return () => {
      observer?.disconnect();
      mobileQuery.removeEventListener("change", observeTargets);
    };
  }, [targets]);

  const scrollToStep = useCallback((stepId: BuilderStepId) => {
    const target = targets.find(({ id }) => id === stepId)?.ref.current;
    if (!target) return;
    setActiveStep(stepId);
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [targets]);

  return { activeStep, scrollToStep };
}
