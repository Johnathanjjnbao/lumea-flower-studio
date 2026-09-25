import { useEffect, type RefObject } from "react";
import { assets, type AssetKey } from "../data/assets";

const imageLoadPromises = new WeakMap<HTMLImageElement, Promise<boolean>>();

function markImageMissing(image: HTMLImageElement) {
  image.closest("figure, a")?.classList.add("image-missing");
  image.hidden = true;
}

export function waitForImage(image: HTMLImageElement | null): Promise<boolean> {
  if (!image) return Promise.resolve(false);
  const target = image;
  const existingPromise = imageLoadPromises.get(target);
  if (existingPromise) return existingPromise;

  const assetKey = target.dataset.asset as AssetKey | undefined;
  const source = assetKey ? assets[assetKey] : undefined;
  if (!source) {
    markImageMissing(target);
    return Promise.resolve(false);
  }

  target.referrerPolicy = "no-referrer";
  const promise = new Promise<boolean>((resolve) => {
    let settled = false;

    async function finish(success: boolean) {
      if (settled) return;
      settled = true;
      target.removeEventListener("load", handleLoad);
      target.removeEventListener("error", handleError);

      if (!success || !target.naturalWidth) {
        markImageMissing(target);
        resolve(false);
        return;
      }

      if (typeof target.decode === "function") {
        try {
          await target.decode();
        } catch {
          // naturalWidth confirms the browser already has a usable raster.
        }
      }

      target.classList.add("image-decoded");
      target.closest("figure, a")?.classList.add("image-ready");
      resolve(true);
    }

    function handleLoad() {
      void finish(true);
    }

    function handleError() {
      void finish(false);
    }

    target.addEventListener("load", handleLoad, { once: true });
    target.addEventListener("error", handleError, { once: true });
    target.loading = "eager";
    if (!target.getAttribute("src")) target.src = source;
    if (target.complete) queueMicrotask(() => void finish(target.naturalWidth > 0));
  });

  imageLoadPromises.set(target, promise);
  return promise;
}

function prepareSectionImages(section: Element) {
  return Promise.all(
    Array.from(section.querySelectorAll<HTMLImageElement>("img[data-asset]")).map(waitForImage),
  );
}

export function useImagePipeline(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const heroImages = Array.from(root.querySelectorAll<HTMLImageElement>(".hero img[data-asset]"));
    heroImages.forEach((image, index) => {
      image.loading = "eager";
      image.decoding = "async";
      if (index === 0) image.fetchPriority = "high";
      void waitForImage(image);
    });

    const deferredSections = Array.from(root.querySelectorAll("main > section:not(.hero)"))
      .filter((section) => section.querySelector("img[data-asset]"));

    if (!("IntersectionObserver" in window)) {
      deferredSections.forEach((section) => void prepareSectionImages(section));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          void prepareSectionImages(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "1100px 0px", threshold: 0 },
    );

    deferredSections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [rootRef]);
}
