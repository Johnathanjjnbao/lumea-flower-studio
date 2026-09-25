(function () {
  const assets = window.LUMEA_PROTOTYPE_ASSETS || {};
  const imageLoadPromises = new WeakMap();
  let imagePrefetchObserver;

  function markImageMissing(image) {
    image.closest("figure, a")?.classList.add("image-missing");
    image.hidden = true;
  }

  function waitForImage(image) {
    if (!image) return Promise.resolve(false);
    if (imageLoadPromises.has(image)) return imageLoadPromises.get(image);

    const source = assets[image.dataset.asset];

    if (!source) {
      markImageMissing(image);
      return Promise.resolve(false);
    }

    image.referrerPolicy = "no-referrer";
    const promise = new Promise((resolve) => {
      let settled = false;

      async function finish(success) {
        if (settled) return;
        settled = true;
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleError);

        if (!success || !image.naturalWidth) {
          markImageMissing(image);
          resolve(false);
          return;
        }

        if (typeof image.decode === "function") {
          try {
            await image.decode();
          } catch {
            // A decoded raster is already available when naturalWidth is positive.
          }
        }

        image.classList.add("image-decoded");
        image.closest("figure, a")?.classList.add("image-ready");
        resolve(true);
      }

      function handleLoad() {
        finish(true);
      }

      function handleError() {
        finish(false);
      }

      image.addEventListener("load", handleLoad, { once: true });
      image.addEventListener("error", handleError, { once: true });

      image.loading = "eager";
      if (!image.getAttribute("src")) image.src = source;

      if (image.complete) {
        window.queueMicrotask(() => finish(image.naturalWidth > 0));
      }
    });

    imageLoadPromises.set(image, promise);
    return promise;
  }

  function prepareSectionImages(section) {
    return Promise.all(
      Array.from(section?.querySelectorAll("img[data-asset]") || []).map(waitForImage),
    );
  }

  function initImageLoading() {
    const hero = document.querySelector(".hero");
    const heroImages = Array.from(hero?.querySelectorAll("img[data-asset]") || []);

    heroImages.forEach((image, index) => {
      image.loading = "eager";
      image.decoding = "async";
      if (index === 0) image.fetchPriority = "high";
      waitForImage(image);
    });

    const deferredSections = Array.from(
      document.querySelectorAll("main > section:not(.hero)"),
    ).filter((section) => section.querySelector("img[data-asset]"));

    if (!("IntersectionObserver" in window)) {
      deferredSections.forEach(prepareSectionImages);
      return;
    }

    imagePrefetchObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          prepareSectionImages(entry.target);
          imagePrefetchObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "1100px 0px", threshold: 0 },
    );

    deferredSections.forEach((section) => imagePrefetchObserver.observe(section));
  }

  initImageLoading();

  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const pageBody = document.body;

  function setMenu(open) {
    if (!menuToggle || !mobileMenu) return;

    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
    mobileMenu.hidden = !open;
    pageBody.classList.toggle("menu-open", open);
  }

  menuToggle?.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menuToggle.focus();
    }
  });

  const toast = document.querySelector("[data-toast]");
  const toastTitle = document.querySelector("[data-toast-title]");
  let toastTimer;

  document.querySelectorAll("[data-prototype-action]").forEach((control) => {
    control.addEventListener("click", () => {
      if (!toast || !toastTitle) return;

      toastTitle.textContent = control.dataset.prototypeAction;
      toast.hidden = false;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, 3200);
    });
  });

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  function initFallbackMotion() {
    if (!("IntersectionObserver" in window)) {
      document.documentElement.dataset.motion = "static";
      return;
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

    const hero = document.querySelector(".hero");
    const heroItems = hero?.querySelectorAll(
      ".hero-copy > *, .hero-image, .hero-caption",
    );

    heroItems?.forEach((item, index) => {
      item.classList.add("motion-fallback-item");
      item.style.setProperty("--motion-order", String(Math.min(index, 7)));
      if (item.matches(".hero-image")) {
        item.querySelector("img")?.classList.add("motion-fallback-image");
      }
    });

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => hero?.classList.add("is-visible"));
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );

    document.querySelectorAll("main > section:not(.hero)").forEach((section) => {
      section.classList.add("motion-fallback-section");
      section.querySelectorAll(fallbackSelector).forEach((item, index) => {
        item.classList.add("motion-fallback-item");
        item.style.setProperty("--motion-order", String(Math.min(index, 8)));
        if (
          item.matches(
            ".occasion-tile, .same-day-image, .florist-image, .custom-image, .budget-option, .craft-story, .gallery-item, .map-placeholder",
          )
        ) {
          const image = item.querySelector("img");
          (image || item).classList.add("motion-fallback-image");
        }
      });
      observer.observe(section);
    });

    window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  }

  function initGsapMotion() {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.dataset.motion = "gsap";

    const media = gsap.matchMedia();

    media.add(
      {
        isDesktop: "(min-width: 760px)",
        isMobile: "(max-width: 759px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { isDesktop, isMobile, reduceMotion } = context.conditions;
        if (reduceMotion) return undefined;

        const distance = isMobile ? 14 : 24;
        const textDuration = isMobile ? 0.34 : 0.42;
        const scrollStart = isMobile ? "top 90%" : "top 82%";

        const clipFrom = {
          left: "inset(0 100% 0 0)",
          right: "inset(0 0 0 100%)",
          down: "inset(0 0 100% 0)",
          up: "inset(100% 0 0 0)",
        };

        const revealProfiles = {
          commerce: {
            duration: isMobile ? 0.68 : 0.88,
            ease: "power2.inOut",
            opacity: 0.58,
            offset: isMobile ? 7 : 11,
            scale: isMobile ? 1.025 : 1.04,
          },
          utility: {
            duration: isMobile ? 0.64 : 0.82,
            ease: "power2.inOut",
            opacity: 0.54,
            offset: isMobile ? 7 : 10,
            scale: isMobile ? 1.025 : 1.035,
          },
          story: {
            duration: isMobile ? 0.84 : 1.08,
            ease: "sine.inOut",
            opacity: 0.42,
            offset: isMobile ? 8 : 14,
            scale: isMobile ? 1.035 : 1.05,
          },
          signature: {
            duration: isMobile ? 0.94 : 1.2,
            ease: "sine.inOut",
            opacity: 0.34,
            offset: isMobile ? 9 : 16,
            scale: isMobile ? 1.04 : 1.06,
          },
        };

        function sectionTimeline(section, start = scrollStart) {
          return gsap.timeline({
            defaults: { ease: "power2.out" },
            scrollTrigger: {
              trigger: section,
              start,
              once: true,
            },
          });
        }

        function fadeFrom(timeline, targets, position, options = {}) {
          const items = gsap.utils.toArray(targets).filter(Boolean);
          if (!items.length) return;

          timeline.from(
            items,
            {
              autoAlpha: 0,
              y: options.y ?? distance,
              x: options.x ?? 0,
              duration: options.duration ?? textDuration,
              stagger: options.stagger ?? 0,
              ease: options.ease ?? "power2.out",
              clearProps: "transform,opacity,visibility",
            },
            position,
          );
        }

        function chapterTitle(timeline, target, position = 0.05, options = {}) {
          if (!target) return;

          timeline.from(
            target,
            {
              clipPath:
                options.direction === "left"
                  ? "inset(0 100% 0 0)"
                  : "inset(0 0 100% 0)",
              autoAlpha: options.opacity ?? 0.45,
              x: options.x ?? 0,
              y: options.y ?? (isMobile ? 14 : 22),
              duration: options.duration ?? (isMobile ? 0.46 : 0.62),
              ease: options.ease ?? "power3.out",
              clearProps: "clip-path,transform,opacity,visibility",
            },
            position,
          );
        }

        function imageReveal(
          timeline,
          figure,
          direction,
          position,
          options = {},
        ) {
          if (!figure) return;
          const image = figure.querySelector("img");
          if (!image) return;
          const profileName = options.profile || (options.signature ? "signature" : "commerce");
          const profile = revealProfiles[profileName] || revealProfiles.commerce;
          const signature = profileName === "signature";
          const duration = options.duration ?? profile.duration;
          const offset = options.offset ?? profile.offset;
          const translateFrom = {
            left: { x: -offset, y: 0 },
            right: { x: offset, y: 0 },
            down: { x: 0, y: offset },
            up: { x: 0, y: -offset },
          }[direction] || { x: -offset, y: 0 };
          let revealed = false;

          image.classList.add("image-reveal-target");
          figure.classList.toggle("image-reveal--signature", signature);
          gsap.set(image, {
            clipPath: clipFrom[direction] || clipFrom.left,
            opacity: options.opacity ?? profile.opacity,
            scale: options.scale ?? profile.scale,
            x: options.x ?? translateFrom.x,
            y: options.y ?? translateFrom.y,
            transformOrigin: "50% 50%",
          });

          function revealWhenDecoded() {
            if (revealed) return;
            revealed = true;

            waitForImage(image).then((ready) => {
              if (!ready) {
                image.classList.remove("image-reveal-target");
                figure.classList.remove("image-reveal--signature");
                return;
              }

              gsap.to(image, {
                clipPath: "inset(0 0 0 0)",
                opacity: 1,
                scale: 1,
                x: 0,
                y: 0,
                duration,
                ease: options.ease ?? profile.ease,
                overwrite: "auto",
                onComplete: () => {
                  image.style.removeProperty("clip-path");
                  image.style.removeProperty("opacity");
                  image.classList.remove("image-reveal-target");
                  figure.classList.remove("image-reveal--signature");
                  if (!options.preserveTransform) {
                    image.style.removeProperty("transform");
                  }
                },
              });
            });
          }

          timeline.call(revealWhenDecoded, null, position);
        }

        function drawHairline(timeline, hairline, position) {
          if (!hairline) return;

          timeline
            .fromTo(
              hairline,
              { "--line-scale": 0 },
              {
                "--line-scale": 1,
                duration: isMobile ? 0.24 : 0.32,
                ease: "power2.out",
              },
              position,
            )
            .fromTo(
              hairline,
              { "--leaf-opacity": 0, "--leaf-rotation": "-30deg" },
              {
                "--leaf-opacity": 1,
                "--leaf-rotation": "-18deg",
                duration: 0.2,
                ease: "power1.out",
              },
              typeof position === "number" ? position + 0.16 : "<0.16",
            );
        }

        const hero = document.querySelector(".hero");
        if (hero) {
          const heroTimeline = gsap.timeline({
            defaults: { ease: "power2.out" },
          });

          fadeFrom(
            heroTimeline,
            document.querySelectorAll(".top-note, .site-header"),
            0,
            {
            y: isMobile ? -6 : -10,
            duration: 0.34,
            },
          );
          fadeFrom(heroTimeline, hero.querySelector(".eyebrow"), 0.08, {
            y: 10,
            duration: 0.3,
          });
          fadeFrom(heroTimeline, hero.querySelector("h1"), 0.2, {
            y: isMobile ? 16 : 22,
            duration: isMobile ? 0.46 : 0.56,
          });
          fadeFrom(heroTimeline, hero.querySelector(".hero-intro"), 0.3, {
            y: 12,
            duration: 0.36,
          });
          fadeFrom(heroTimeline, hero.querySelector(".hero-actions"), 0.42, {
            y: 10,
            duration: 0.34,
          });
          imageReveal(
            heroTimeline,
            hero.querySelector(".hero-image--main"),
            "left",
            0.04,
            {
              preserveTransform: true,
              profile: "signature",
            },
          );
          imageReveal(
            heroTimeline,
            hero.querySelector(".hero-image--detail"),
            "up",
            0.42,
            { profile: "story", preserveTransform: true },
          );
          fadeFrom(heroTimeline, hero.querySelector(".hero-caption"), 0.72, {
            y: 8,
            duration: 0.28,
          });
          fadeFrom(heroTimeline, hero.querySelector(".hero-commerce"), 0.7, {
            y: 8,
            duration: 0.32,
          });
          drawHairline(
            heroTimeline,
            hero.querySelector(".hero-commerce .botanical-hairline"),
            0.78,
          );
        }

        const occasions = document.querySelector(".occasions");
        if (occasions) {
          const timeline = sectionTimeline(occasions);
          fadeFrom(timeline, occasions.querySelector(".eyebrow"), 0, {
            y: 8,
            duration: 0.28,
          });
          chapterTitle(timeline, occasions.querySelector("h2"), 0.04);
          fadeFrom(timeline, occasions.querySelector(".section-heading > p"), 0.18, {
            y: isMobile ? 8 : 12,
            duration: isMobile ? 0.3 : 0.38,
          });
          occasions.querySelectorAll(".occasion-tile").forEach((tile, index) => {
            const position = 0.08 + index * (isMobile ? 0.075 : 0.1);
            imageReveal(
              timeline,
              tile,
              index % 2 === 0 ? "left" : "right",
              position,
              { profile: "commerce" },
            );
            fadeFrom(timeline, tile.querySelectorAll(".occasion-number, .occasion-name"), position + 0.22, {
              y: 8,
              duration: 0.24,
              stagger: 0.04,
            });
          });
        }

        const bestSellers = document.querySelector(".best-sellers");
        if (bestSellers) {
          const timeline = sectionTimeline(bestSellers);
          fadeFrom(timeline, bestSellers.querySelector(".eyebrow"), 0, {
            y: 8,
            duration: 0.28,
          });
          chapterTitle(timeline, bestSellers.querySelector("h2"), 0.04);
          fadeFrom(timeline, bestSellers.querySelector(".text-link"), 0.18, {
            y: 8,
            duration: 0.3,
          });
          bestSellers.querySelectorAll(".product-card").forEach((card, index) => {
            const position = 0.08 + index * (isMobile ? 0.06 : 0.085);
            imageReveal(
              timeline,
              card.querySelector(".product-image"),
              index % 2 === 0 ? "left" : "right",
              position,
              { profile: "commerce" },
            );
            fadeFrom(timeline, card.querySelector(".product-meta"), position + 0.14, {
              y: isMobile ? 10 : 16,
              duration: isMobile ? 0.3 : 0.4,
            });
          });
        }

        const budget = document.querySelector(".budget");
        if (budget) {
          const timeline = sectionTimeline(budget);
          fadeFrom(timeline, budget.querySelector(".eyebrow"), 0, {
            y: 8,
            duration: 0.28,
          });
          chapterTitle(timeline, budget.querySelector("h2"), 0.04);
          fadeFrom(timeline, budget.querySelector(".budget-intro > p:last-child"), 0.18, {
            y: isMobile ? 8 : 12,
            duration: isMobile ? 0.3 : 0.38,
          });
          fadeFrom(timeline, budget.querySelectorAll(".budget-option"), 0.12, {
            y: isMobile ? 10 : 16,
            duration: isMobile ? 0.34 : 0.42,
            stagger: isMobile ? 0.055 : 0.075,
          });
        }

        const sameDay = document.querySelector(".same-day");
        if (sameDay) {
          const timeline = sectionTimeline(sameDay);
          fadeFrom(timeline, sameDay.querySelectorAll(".same-day-copy > *:not(h2)"), 0, {
            y: isMobile ? 10 : 16,
            duration: isMobile ? 0.28 : 0.34,
            stagger: 0.035,
          });
          chapterTitle(timeline, sameDay.querySelector("h2"), 0.04, {
            y: isMobile ? 8 : 12,
            duration: isMobile ? 0.38 : 0.46,
          });
          imageReveal(
            timeline,
            sameDay.querySelector(".same-day-image"),
            "right",
            0.02,
            { profile: "utility" },
          );
          const dot = sameDay.querySelector(".status-dot");
          if (dot) {
            timeline
              .to(dot, { scale: 1.3, duration: 0.16, ease: "power1.out" }, 0.16)
              .to(dot, {
                scale: 1,
                duration: 0.2,
                ease: "power1.inOut",
                clearProps: "transform",
              });
          }
        }

        const florist = document.querySelector(".florist-choice");
        if (florist) {
          const timeline = sectionTimeline(florist, isMobile ? "top 88%" : "top 76%");
          imageReveal(
            timeline,
            florist.querySelector(".florist-image"),
            "left",
            0,
            {
              preserveTransform: true,
              profile: "signature",
            },
          );
          fadeFrom(timeline, florist.querySelector(".eyebrow"), 0.1, {
            y: 8,
            duration: 0.28,
          });
          drawHairline(timeline, florist.querySelector(".botanical-hairline"), 0.15);
          chapterTitle(timeline, florist.querySelector("h2"), 0.2, {
            direction: "left",
            y: 0,
            duration: isMobile ? 0.52 : 0.72,
          });
          fadeFrom(timeline, florist.querySelector(".florist-intro"), 0.4, {
            y: 12,
            duration: 0.32,
          });
          fadeFrom(timeline, florist.querySelector(".florist-brief"), 0.5, {
            y: isMobile ? 10 : 14,
            duration: 0.34,
          });
          fadeFrom(timeline, florist.querySelectorAll(".brief-field"), 0.58, {
            y: isMobile ? 7 : 10,
            duration: 0.28,
            stagger: isMobile ? 0.035 : 0.05,
          });
          fadeFrom(timeline, florist.querySelector(".button"), 0.7, {
            y: 8,
            duration: 0.28,
          });
        }

        const custom = document.querySelector(".custom");
        if (custom) {
          const timeline = sectionTimeline(custom);
          imageReveal(
            timeline,
            custom.querySelector(".custom-image"),
            "left",
            0,
            {
              preserveTransform: true,
              profile: "signature",
            },
          );
          fadeFrom(timeline, custom.querySelector(".eyebrow"), 0.1, {
            y: 8,
            duration: 0.28,
          });
          drawHairline(timeline, custom.querySelector(".botanical-hairline"), 0.14);
          chapterTitle(timeline, custom.querySelector("h2"), 0.2, {
            direction: "left",
            y: 0,
            duration: isMobile ? 0.5 : 0.68,
          });
          fadeFrom(timeline, custom.querySelector(".custom-intro"), 0.38, {
            x: isMobile ? 10 : 18,
            y: 0,
            duration: isMobile ? 0.34 : 0.44,
          });
          fadeFrom(timeline, custom.querySelector(".bouquet-builder"), 0.5, {
            x: isMobile ? 10 : 18,
            y: 0,
            duration: isMobile ? 0.34 : 0.44,
          });
          fadeFrom(timeline, custom.querySelectorAll(".flower-pick"), 0.58, {
            y: isMobile ? 8 : 12,
            duration: isMobile ? 0.28 : 0.34,
            stagger: isMobile ? 0.04 : 0.06,
          });
          fadeFrom(timeline, custom.querySelector(".wrapping-choice"), 0.66, {
            y: 8,
            duration: 0.28,
          });
          fadeFrom(timeline, custom.querySelectorAll(".bouquet-builder > .button, .custom-assist"), 0.72, {
            y: 8,
            duration: isMobile ? 0.28 : 0.34,
            stagger: 0.07,
          });
        }

        const why = document.querySelector(".why");
        if (why) {
          const timeline = sectionTimeline(why);
          fadeFrom(timeline, why.querySelector(".eyebrow"), 0, {
            y: 8,
            duration: 0.28,
          });
          chapterTitle(timeline, why.querySelector("h2"), 0.04);
          fadeFrom(timeline, why.querySelector(".why-heading > p:last-child"), 0.18, {
            y: isMobile ? 8 : 12,
            duration: isMobile ? 0.3 : 0.38,
          });
          why.querySelectorAll(".craft-story").forEach((story, index) => {
            const position = 0.08 + index * (isMobile ? 0.08 : 0.11);
            imageReveal(
              timeline,
              story.querySelector(".craft-story__image"),
              index === 1 ? "up" : "down",
              position,
              { profile: "story" },
            );
            fadeFrom(timeline, story.querySelector("figcaption"), position + 0.16, {
              y: isMobile ? 8 : 12,
              duration: 0.32,
            });
          });
        }

        const gallery = document.querySelector(".gallery");
        if (gallery) {
          const timeline = sectionTimeline(gallery);
          fadeFrom(timeline, gallery.querySelector(".eyebrow"), 0, {
            y: 8,
            duration: 0.28,
          });
          chapterTitle(timeline, gallery.querySelector("h2"), 0.06, {
            direction: "left",
            y: 0,
            duration: isMobile ? 0.5 : 0.68,
          });
          fadeFrom(timeline, gallery.querySelector(".text-link"), 0.18, {
            y: 8,
            duration: 0.3,
          });
          drawHairline(timeline, gallery.querySelector(".botanical-hairline"), 0.12);

          const galleryDirections = ["down", "left", "up", "right", "left", "up"];
          gallery.querySelectorAll(".gallery-item").forEach((item, index) => {
            imageReveal(
              timeline,
              item,
              galleryDirections[index],
              0.14 + index * (isMobile ? 0.09 : 0.12),
              {
                profile: index === 0 ? "signature" : "story",
                preserveTransform: index === 0,
                offset: index === 0 ? 0 : undefined,
              },
            );
            fadeFrom(timeline, item.querySelector("figcaption"), 0.4 + index * (isMobile ? 0.07 : 0.09), {
              y: 6,
              duration: 0.24,
            });
          });
        }

        const visit = document.querySelector(".visit");
        if (visit) {
          const timeline = sectionTimeline(visit, isMobile ? "top 92%" : "top 86%");
          fadeFrom(timeline, visit.querySelectorAll(".visit-copy > *:not(h2)"), 0, {
            y: isMobile ? 10 : 14,
            duration: isMobile ? 0.3 : 0.36,
            stagger: 0.045,
          });
          chapterTitle(timeline, visit.querySelector("h2"), 0.04, {
            y: isMobile ? 8 : 10,
            duration: isMobile ? 0.36 : 0.44,
          });
          timeline.from(
            visit.querySelector(".map-placeholder"),
            {
              clipPath: "inset(0 0 0 100%)",
              duration: isMobile ? 0.5 : 0.64,
              ease: "power2.inOut",
              clearProps: "clip-path",
            },
            0.08,
          );
        }

        if (isDesktop) {
          [
            [".hero-image--main", 24],
            [".florist-image", 20],
            [".custom-image", 16],
            [".gallery-item--one", 16],
          ].forEach(([selector, movement]) => {
            const figure = document.querySelector(selector);
            const image = figure?.querySelector("img");
            if (!figure || !image) return;

            gsap.fromTo(
              image,
              { y: -movement / 2 },
              {
                y: movement / 2,
                ease: "none",
                overwrite: "auto",
                scrollTrigger: {
                  trigger: figure,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.8,
                },
              },
            );
          });
        }

        return undefined;
      },
    );

    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
    window.addEventListener("pagehide", () => media.revert(), { once: true });
  }

  function initMotion() {
    if (reduceMotionQuery.matches) {
      document.documentElement.dataset.motion = "reduced";
      return;
    }

    if (window.gsap && window.ScrollTrigger) {
      try {
        initGsapMotion();
        return;
      } catch {
        document
          .querySelectorAll("main *, .top-note, .site-header")
          .forEach((element) => {
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
        document.documentElement.dataset.motion = "fallback";
      }
    }

    initFallbackMotion();
  }

  initMotion();
  window.addEventListener(
    "pagehide",
    () => imagePrefetchObserver?.disconnect(),
    { once: true },
  );
})();
