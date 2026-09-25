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

interface ImagePipelineOptions {
  prioritySelector?: string;
  observe?: "sections" | "images";
  preloadMargin?: string;
}

export function useImagePipeline(
  rootRef: RefObject<HTMLElement | null>,
  {
    prioritySelector = ".hero",
    observe = "sections",
    preloadMargin = "1100px 0px",
  }: ImagePipelineOptions = {},
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const priorityImages = prioritySelector
      ? Array.from(root.querySelectorAll<HTMLImageElement>(`${prioritySelector} img[data-asset]`))
      : [];
    priorityImages.forEach((image, index) => {
      image.loading = "eager";
      image.decoding = "async";
      if (index === 0) image.fetchPriority = "high";
      void waitForImage(image);
    });

    const deferredTargets = observe === "images"
      ? Array.from(root.querySelectorAll<HTMLImageElement>("img[data-asset]"))
        .filter((image) => !priorityImages.includes(image))
      : Array.from(root.querySelectorAll("main > section"))
        .filter((section) => !prioritySelector || !section.matches(prioritySelector))
        .filter((section) => section.querySelector("img[data-asset]"));

    const prepareTarget = (target: Element) => target instanceof HTMLImageElement
      ? waitForImage(target)
      : prepareSectionImages(target);

    if (!("IntersectionObserver" in window)) {
      deferredTargets.forEach((target) => void prepareTarget(target));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          void prepareTarget(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: preloadMargin, threshold: 0 },
    );

    deferredTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [observe, preloadMargin, prioritySelector, rootRef]);
}
