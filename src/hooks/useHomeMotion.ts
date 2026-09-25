import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
import { waitForImage } from "./useImagePipeline";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Direction = "left" | "right" | "down" | "up";
type RevealProfile = "commerce" | "utility" | "story" | "signature";
type DomTargets = Element | Element[] | NodeListOf<Element> | null | undefined;

function asElements(targets: DomTargets): Element[] {
  if (!targets) return [];
  if (targets instanceof Element) return [targets];
  return Array.from(targets);
}

function clearMotionStyles(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("main *, .top-note, .site-header").forEach((element) => {
    [
      "opacity",
      "visibility",
      "transform",
      "clip-path",
      "will-change",
      "--line-scale",
      "--leaf-opacity",
      "--leaf-rotation",
    ].forEach((property) => element.style.removeProperty(property));
  });
}

function initFallbackMotion(root: HTMLElement) {
  if (!("IntersectionObserver" in window)) {
    document.documentElement.dataset.motion = "static";
    return () => undefined;
  }

  const fallbackSelector = [
    ".section-heading",
    ".occasion-tile",
    ".product-card",
    ".budget-intro",
    ".budget-option",
    ".same-day-copy",
    ".same-day-image",
    ".florist-image",
    ".florist-copy",
    ".custom-image",
    ".custom-copy",
    ".why-heading",
    ".craft-story",
    ".gallery-heading",
    ".gallery-item",
    ".visit-copy",
    ".map-placeholder",
  ].join(",");

  document.documentElement.classList.add("motion-fallback");
  document.documentElement.dataset.motion = "fallback";

  const hero = root.querySelector(".hero");
  const heroItems = hero?.querySelectorAll<HTMLElement>(".hero-copy > *, .hero-image, .hero-caption");
  heroItems?.forEach((item, index) => {
    item.classList.add("motion-fallback-item");
    item.style.setProperty("--motion-order", String(Math.min(index, 7)));
    if (item.matches(".hero-image")) item.querySelector("img")?.classList.add("motion-fallback-image");
  });

  let secondFrame = 0;
  const firstFrame = window.requestAnimationFrame(() => {
    secondFrame = window.requestAnimationFrame(() => hero?.classList.add("is-visible"));
  });

  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }),
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  const sections = root.querySelectorAll<HTMLElement>("main > section:not(.hero)");
  sections.forEach((section) => {
    section.classList.add("motion-fallback-section");
    section.querySelectorAll<HTMLElement>(fallbackSelector).forEach((item, index) => {
      item.classList.add("motion-fallback-item");
      item.style.setProperty("--motion-order", String(Math.min(index, 8)));
      if (item.matches(".occasion-tile, .same-day-image, .florist-image, .custom-image, .budget-option, .craft-story, .gallery-item, .map-placeholder")) {
        (item.querySelector("img") ?? item).classList.add("motion-fallback-image");
      }
    });
    observer.observe(section);
  });

  return () => {
    observer.disconnect();
    window.cancelAnimationFrame(firstFrame);
    window.cancelAnimationFrame(secondFrame);
    document.documentElement.classList.remove("motion-fallback");
    root.querySelectorAll<HTMLElement>(".motion-fallback-item, .motion-fallback-image, .motion-fallback-section, .is-visible").forEach((item) => {
      item.classList.remove("motion-fallback-item", "motion-fallback-image", "motion-fallback-section", "is-visible");
      item.style.removeProperty("--motion-order");
    });
  };
}

export function useHomeMotion(rootRef: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    const root = rootRef.current;
    if (!root) return;
    let active = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.dataset.motion = "reduced";
      return () => {
        active = false;
      };
    }

    let fallbackCleanup: (() => void) | undefined;

    try {
      document.documentElement.dataset.motion = "gsap";
      const media = gsap.matchMedia();

      media.add(
        {
          isDesktop: "(min-width: 760px)",
          isMobile: "(max-width: 759px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isDesktop, isMobile, reduceMotion } = context.conditions as {
            isDesktop: boolean;
            isMobile: boolean;
            reduceMotion: boolean;
          };
          if (reduceMotion) return;

          const distance = isMobile ? 14 : 24;
          const textDuration = isMobile ? 0.34 : 0.42;
          const scrollStart = isMobile ? "top 90%" : "top 82%";
          const clipFrom: Record<Direction, string> = {
            left: "inset(0 100% 0 0)",
            right: "inset(0 0 0 100%)",
            down: "inset(0 0 100% 0)",
            up: "inset(100% 0 0 0)",
          };
          const revealProfiles: Record<RevealProfile, { duration: number; ease: string; opacity: number; offset: number; scale: number }> = {
            commerce: { duration: isMobile ? 0.68 : 0.88, ease: "power2.inOut", opacity: 0.58, offset: isMobile ? 7 : 11, scale: isMobile ? 1.025 : 1.04 },
            utility: { duration: isMobile ? 0.64 : 0.82, ease: "power2.inOut", opacity: 0.54, offset: isMobile ? 7 : 10, scale: isMobile ? 1.025 : 1.035 },
            story: { duration: isMobile ? 0.84 : 1.08, ease: "sine.inOut", opacity: 0.42, offset: isMobile ? 8 : 14, scale: isMobile ? 1.035 : 1.05 },
            signature: { duration: isMobile ? 0.94 : 1.2, ease: "sine.inOut", opacity: 0.34, offset: isMobile ? 9 : 16, scale: isMobile ? 1.04 : 1.06 },
          };

          function sectionTimeline(section: Element, start = scrollStart) {
            return gsap.timeline({
              defaults: { ease: "power2.out" },
              scrollTrigger: { trigger: section, start, once: true },
            });
          }

          function fadeFrom(
            timeline: gsap.core.Timeline,
            targets: DomTargets,
            position: gsap.Position,
            options: { y?: number; x?: number; duration?: number; stagger?: number; ease?: string } = {},
          ) {
            const items = asElements(targets);
            if (!items.length) return;
            timeline.from(items, {
              autoAlpha: 0,
              y: options.y ?? distance,
              x: options.x ?? 0,
              duration: options.duration ?? textDuration,
              stagger: options.stagger ?? 0,
              ease: options.ease ?? "power2.out",
              clearProps: "transform,opacity,visibility",
            }, position);
          }

          function chapterTitle(
            timeline: gsap.core.Timeline,
            target: Element | null,
            position: gsap.Position = 0.05,
            options: { direction?: "left"; opacity?: number; x?: number; y?: number; duration?: number; ease?: string } = {},
          ) {
            if (!target) return;
            timeline.from(target, {
              clipPath: options.direction === "left" ? "inset(0 100% 0 0)" : "inset(0 0 100% 0)",
              autoAlpha: options.opacity ?? 0.45,
              x: options.x ?? 0,
              y: options.y ?? (isMobile ? 14 : 22),
              duration: options.duration ?? (isMobile ? 0.46 : 0.62),
              ease: options.ease ?? "power3.out",
              clearProps: "clip-path,transform,opacity,visibility",
            }, position);
          }

          function imageReveal(
            timeline: gsap.core.Timeline,
            figure: Element | null,
            direction: Direction,
            position: gsap.Position,
            options: { profile?: RevealProfile; duration?: number; offset?: number; opacity?: number; scale?: number; x?: number; y?: number; ease?: string; preserveTransform?: boolean } = {},
          ) {
            if (!figure) return;
            const image = figure.querySelector<HTMLImageElement>("img");
            if (!image) return;
            const profileName = options.profile ?? "commerce";
            const profile = revealProfiles[profileName];
            const signature = profileName === "signature";
            const duration = options.duration ?? profile.duration;
            const offset = options.offset ?? profile.offset;
            const translateFrom: Record<Direction, { x: number; y: number }> = {
              left: { x: -offset, y: 0 }, right: { x: offset, y: 0 }, down: { x: 0, y: offset }, up: { x: 0, y: -offset },
            };
            let revealed = false;

            image.classList.add("image-reveal-target");
            figure.classList.toggle("image-reveal--signature", signature);
            gsap.set(image, {
              clipPath: clipFrom[direction],
              opacity: options.opacity ?? profile.opacity,
              scale: options.scale ?? profile.scale,
              x: options.x ?? translateFrom[direction].x,
              y: options.y ?? translateFrom[direction].y,
              transformOrigin: "50% 50%",
            });

            const revealWhenDecoded = () => {
              if (revealed) return;
              revealed = true;
              void waitForImage(image).then((ready) => {
                if (!active) return;
                if (!ready) {
                  image.classList.remove("image-reveal-target");
                  figure.classList.remove("image-reveal--signature");
                  return;
                }
                gsap.to(image, {
                  clipPath: "inset(0 0 0 0)", opacity: 1, scale: 1, x: 0, y: 0,
                  duration, ease: options.ease ?? profile.ease, overwrite: "auto",
                  onComplete: () => {
                    image.style.removeProperty("clip-path");
                    image.style.removeProperty("opacity");
                    image.classList.remove("image-reveal-target");
                    figure.classList.remove("image-reveal--signature");
                    if (!options.preserveTransform) image.style.removeProperty("transform");
                  },
                });
              });
            };
            timeline.call(revealWhenDecoded, undefined, position);
          }

          function drawHairline(timeline: gsap.core.Timeline, hairline: Element | null, position: gsap.Position) {
            if (!hairline) return;
            timeline
              .fromTo(hairline, { "--line-scale": 0 }, { "--line-scale": 1, duration: isMobile ? 0.24 : 0.32, ease: "power2.out" }, position)
              .fromTo(hairline, { "--leaf-opacity": 0, "--leaf-rotation": "-30deg" }, { "--leaf-opacity": 1, "--leaf-rotation": "-18deg", duration: 0.2, ease: "power1.out" }, typeof position === "number" ? position + 0.16 : "<0.16");
          }

          const query = <T extends Element = Element>(selector: string) => root.querySelector<T>(selector);

          const hero = query(".hero");
          if (hero) {
            const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
            fadeFrom(timeline, root.querySelectorAll(".top-note, .site-header"), 0, { y: isMobile ? -6 : -10, duration: 0.34 });
            fadeFrom(timeline, hero.querySelector(".eyebrow"), 0.08, { y: 10, duration: 0.3 });
            fadeFrom(timeline, hero.querySelector("h1"), 0.2, { y: isMobile ? 16 : 22, duration: isMobile ? 0.46 : 0.56 });
            fadeFrom(timeline, hero.querySelector(".hero-intro"), 0.3, { y: 12, duration: 0.36 });
            fadeFrom(timeline, hero.querySelector(".hero-actions"), 0.42, { y: 10, duration: 0.34 });
            imageReveal(timeline, hero.querySelector(".hero-image--main"), "left", 0.04, { preserveTransform: true, profile: "signature" });
            imageReveal(timeline, hero.querySelector(".hero-image--detail"), "up", 0.42, { profile: "story", preserveTransform: true });
            fadeFrom(timeline, hero.querySelector(".hero-caption"), 0.72, { y: 8, duration: 0.28 });
            fadeFrom(timeline, hero.querySelector(".hero-commerce"), 0.7, { y: 8, duration: 0.32 });
            drawHairline(timeline, hero.querySelector(".hero-commerce .botanical-hairline"), 0.78);
          }

          const occasions = query(".occasions");
          if (occasions) {
            const timeline = sectionTimeline(occasions);
            fadeFrom(timeline, occasions.querySelector(".eyebrow"), 0, { y: 8, duration: 0.28 });
            chapterTitle(timeline, occasions.querySelector("h2"), 0.04);
            fadeFrom(timeline, occasions.querySelector(".section-heading > p"), 0.18, { y: isMobile ? 8 : 12, duration: isMobile ? 0.3 : 0.38 });
            occasions.querySelectorAll(".occasion-tile").forEach((tile, index) => {
              const position = 0.08 + index * (isMobile ? 0.075 : 0.1);
              imageReveal(timeline, tile, index % 2 === 0 ? "left" : "right", position, { profile: "commerce" });
              fadeFrom(timeline, tile.querySelectorAll(".occasion-number, .occasion-name"), position + 0.22, { y: 8, duration: 0.24, stagger: 0.04 });
            });
          }

          const bestSellers = query(".best-sellers");
          if (bestSellers) {
            const timeline = sectionTimeline(bestSellers);
            fadeFrom(timeline, bestSellers.querySelector(".eyebrow"), 0, { y: 8, duration: 0.28 });
            chapterTitle(timeline, bestSellers.querySelector("h2"), 0.04);
            fadeFrom(timeline, bestSellers.querySelector(".text-link"), 0.18, { y: 8, duration: 0.3 });
            bestSellers.querySelectorAll(".product-card").forEach((card, index) => {
              const position = 0.08 + index * (isMobile ? 0.06 : 0.085);
              imageReveal(timeline, card.querySelector(".product-image"), index % 2 === 0 ? "left" : "right", position, { profile: "commerce" });
              fadeFrom(timeline, card.querySelector(".product-meta"), position + 0.14, { y: isMobile ? 10 : 16, duration: isMobile ? 0.3 : 0.4 });
            });
          }

          const budget = query(".budget");
          if (budget) {
            const timeline = sectionTimeline(budget);
            fadeFrom(timeline, budget.querySelector(".eyebrow"), 0, { y: 8, duration: 0.28 });
            chapterTitle(timeline, budget.querySelector("h2"), 0.04);
            fadeFrom(timeline, budget.querySelector(".budget-intro > p:last-child"), 0.18, { y: isMobile ? 8 : 12, duration: isMobile ? 0.3 : 0.38 });
            fadeFrom(timeline, budget.querySelectorAll(".budget-option"), 0.12, { y: isMobile ? 10 : 16, duration: isMobile ? 0.34 : 0.42, stagger: isMobile ? 0.055 : 0.075 });
          }

          const sameDay = query(".same-day");
          if (sameDay) {
            const timeline = sectionTimeline(sameDay);
            fadeFrom(timeline, sameDay.querySelectorAll(".same-day-copy > *:not(h2)"), 0, { y: isMobile ? 10 : 16, duration: isMobile ? 0.28 : 0.34, stagger: 0.035 });
            chapterTitle(timeline, sameDay.querySelector("h2"), 0.04, { y: isMobile ? 8 : 12, duration: isMobile ? 0.38 : 0.46 });
            imageReveal(timeline, sameDay.querySelector(".same-day-image"), "right", 0.02, { profile: "utility" });
            const dot = sameDay.querySelector(".status-dot");
            if (dot) timeline.to(dot, { scale: 1.3, duration: 0.16, ease: "power1.out" }, 0.16).to(dot, { scale: 1, duration: 0.2, ease: "power1.inOut", clearProps: "transform" });
          }

          const florist = query(".florist-choice");
          if (florist) {
            const timeline = sectionTimeline(florist, isMobile ? "top 88%" : "top 76%");
            imageReveal(timeline, florist.querySelector(".florist-image"), "left", 0, { preserveTransform: true, profile: "signature" });
            fadeFrom(timeline, florist.querySelector(".eyebrow"), 0.1, { y: 8, duration: 0.28 });
            drawHairline(timeline, florist.querySelector(".botanical-hairline"), 0.15);
            chapterTitle(timeline, florist.querySelector("h2"), 0.2, { direction: "left", y: 0, duration: isMobile ? 0.52 : 0.72 });
            fadeFrom(timeline, florist.querySelector(".florist-intro"), 0.4, { y: 12, duration: 0.32 });
            fadeFrom(timeline, florist.querySelector(".florist-brief"), 0.5, { y: isMobile ? 10 : 14, duration: 0.34 });
            fadeFrom(timeline, florist.querySelectorAll(".brief-field"), 0.58, { y: isMobile ? 7 : 10, duration: 0.28, stagger: isMobile ? 0.035 : 0.05 });
            fadeFrom(timeline, florist.querySelector(".button"), 0.7, { y: 8, duration: 0.28 });
          }

          const custom = query(".custom");
          if (custom) {
            const timeline = sectionTimeline(custom);
            imageReveal(timeline, custom.querySelector(".custom-image"), "left", 0, { preserveTransform: true, profile: "signature" });
            fadeFrom(timeline, custom.querySelector(".eyebrow"), 0.1, { y: 8, duration: 0.28 });
            drawHairline(timeline, custom.querySelector(".botanical-hairline"), 0.14);
            chapterTitle(timeline, custom.querySelector("h2"), 0.2, { direction: "left", y: 0, duration: isMobile ? 0.5 : 0.68 });
            fadeFrom(timeline, custom.querySelector(".custom-intro"), 0.38, { x: isMobile ? 10 : 18, y: 0, duration: isMobile ? 0.34 : 0.44 });
            fadeFrom(timeline, custom.querySelector(".bouquet-builder"), 0.5, { x: isMobile ? 10 : 18, y: 0, duration: isMobile ? 0.34 : 0.44 });
            fadeFrom(timeline, custom.querySelectorAll(".flower-pick"), 0.58, { y: isMobile ? 8 : 12, duration: isMobile ? 0.28 : 0.34, stagger: isMobile ? 0.04 : 0.06 });
            fadeFrom(timeline, custom.querySelector(".wrapping-choice"), 0.66, { y: 8, duration: 0.28 });
            fadeFrom(timeline, custom.querySelectorAll(".bouquet-builder > .button, .custom-assist"), 0.72, { y: 8, duration: isMobile ? 0.28 : 0.34, stagger: 0.07 });
          }

          const why = query(".why");
          if (why) {
            const timeline = sectionTimeline(why);
            fadeFrom(timeline, why.querySelector(".eyebrow"), 0, { y: 8, duration: 0.28 });
            chapterTitle(timeline, why.querySelector("h2"), 0.04);
            fadeFrom(timeline, why.querySelector(".why-heading > p:last-child"), 0.18, { y: isMobile ? 8 : 12, duration: isMobile ? 0.3 : 0.38 });
            why.querySelectorAll(".craft-story").forEach((story, index) => {
              const position = 0.08 + index * (isMobile ? 0.08 : 0.11);
              imageReveal(timeline, story.querySelector(".craft-story__image"), index === 1 ? "up" : "down", position, { profile: "story" });
              fadeFrom(timeline, story.querySelector("figcaption"), position + 0.16, { y: isMobile ? 8 : 12, duration: 0.32 });
            });
          }

          const gallery = query(".gallery");
          if (gallery) {
            const timeline = sectionTimeline(gallery);
            fadeFrom(timeline, gallery.querySelector(".eyebrow"), 0, { y: 8, duration: 0.28 });
            chapterTitle(timeline, gallery.querySelector("h2"), 0.06, { direction: "left", y: 0, duration: isMobile ? 0.5 : 0.68 });
            fadeFrom(timeline, gallery.querySelector(".text-link"), 0.18, { y: 8, duration: 0.3 });
            drawHairline(timeline, gallery.querySelector(".botanical-hairline"), 0.12);
            const galleryDirections: Direction[] = ["down", "left", "up", "right", "left", "up"];
            gallery.querySelectorAll(".gallery-item").forEach((item, index) => {
              imageReveal(timeline, item, galleryDirections[index], 0.14 + index * (isMobile ? 0.09 : 0.12), { profile: index === 0 ? "signature" : "story", preserveTransform: index === 0, offset: index === 0 ? 0 : undefined });
              fadeFrom(timeline, item.querySelector("figcaption"), 0.4 + index * (isMobile ? 0.07 : 0.09), { y: 6, duration: 0.24 });
            });
          }

          const visit = query(".visit");
          if (visit) {
            const timeline = sectionTimeline(visit, isMobile ? "top 92%" : "top 86%");
            fadeFrom(timeline, visit.querySelectorAll(".visit-copy > *:not(h2)"), 0, { y: isMobile ? 10 : 14, duration: isMobile ? 0.3 : 0.36, stagger: 0.045 });
            chapterTitle(timeline, visit.querySelector("h2"), 0.04, { y: isMobile ? 8 : 10, duration: isMobile ? 0.36 : 0.44 });
            timeline.from(visit.querySelector(".map-placeholder"), { clipPath: "inset(0 0 0 100%)", duration: isMobile ? 0.5 : 0.64, ease: "power2.inOut", clearProps: "clip-path" }, 0.08);
          }

          if (isDesktop) {
            const parallaxTargets: Array<[string, number]> = [[".hero-image--main", 24], [".florist-image", 20], [".custom-image", 16], [".gallery-item--one", 16]];
            parallaxTargets.forEach(([selector, movement]) => {
              const figure = query(selector);
              const image = figure?.querySelector("img");
              if (!figure || !image) return;
              gsap.fromTo(image, { y: -movement / 2 }, { y: movement / 2, ease: "none", overwrite: "auto", scrollTrigger: { trigger: figure, start: "top bottom", end: "bottom top", scrub: 0.8 } });
            });
          }
        },
      );

      const refresh = () => ScrollTrigger.refresh();
      let refreshFrame = 0;
      if (document.readyState === "complete") refreshFrame = requestAnimationFrame(refresh);
      else window.addEventListener("load", refresh, { once: true });

      return () => {
        active = false;
        window.cancelAnimationFrame(refreshFrame);
        window.removeEventListener("load", refresh);
        media.revert();
      };
    } catch {
      clearMotionStyles(root);
      fallbackCleanup = initFallbackMotion(root);
      return () => {
        active = false;
        fallbackCleanup?.();
      };
    }
  }, { scope: rootRef });
}
