import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react";
import { products } from "./src/data/content";

function githubPagesRouteEntries(mode: string): Plugin {
  const hostedReview = mode === "review-hosted" || mode === "review-cloudflare";
  let outputDirectory: string;
  return {
    name: "github-pages-route-entries",
    apply: "build",
    configResolved(config: ResolvedConfig) {
      outputDirectory = isAbsolute(config.build.outDir) ? config.build.outDir : resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      if (!hostedReview) return html;
      return html
        .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, '<meta name="description" content="Luméa Flower Studio — bản xem trước VI/KO. Sản phẩm và giá chỉ minh họa; không nhận đơn thật." />')
        .replace("<title>Luméa Flower Studio — Hoa cho những điều khó nói thành lời</title>", "<title>Luméa — Bản xem trước / Review Demo</title>")
        .replace("</head>", '  <meta name="robots" content="noindex,nofollow,noarchive" />\n  </head>')
        .replace(/\r\r?\n/g, "\n");
    },
    async writeBundle() {
      const appShell = await readFile(resolve(outputDirectory, "index.html"), "utf8");
      const routes = [
        "flowers",
        "create-bouquet",
        "cart",
        "checkout",
        "order-confirmation",
        "policies",
        "about",
        "contact",
        "same-day",
        "ko",
        "ko/flowers",
        "ko/create-bouquet",
        "ko/cart",
        "ko/checkout",
        "ko/order-confirmation",
        "ko/policies",
        "ko/about",
        "ko/contact",
        "ko/same-day",
        "admin",
        "admin/login",
        "admin/forgot-password",
        "admin/reset-password",
        "admin/products",
        "admin/categories",
        "admin/navigation",
        "admin/commercial-policies",
        "admin/orders",
        "ko/admin",
        "ko/admin/login",
        "ko/admin/forgot-password",
        "ko/admin/reset-password",
        "ko/admin/products",
        "ko/admin/categories",
        "ko/admin/navigation",
        "ko/admin/commercial-policies",
        "ko/admin/orders",
      ];
      if (hostedReview) for (const product of products) {
        routes.push(`flowers/${product.slug}`, `ko/flowers/${product.slug}`);
      }

      await Promise.all(routes.map(async (route) => {
        const routeDirectory = resolve(outputDirectory, route);
        await mkdir(routeDirectory, { recursive: true });
        await writeFile(resolve(routeDirectory, "index.html"), appShell);
      }));
      await writeFile(resolve(outputDirectory, "404.html"), appShell);
      if (mode === "review-hosted") await writeFile(resolve(outputDirectory, ".nojekyll"), "");
    },
  };
}

function reviewImportBoundary(mode: string): Plugin {
  return {
    name: "review-import-boundary",
    apply: "build",
    generateBundle(_, bundle) {
      if (mode !== "review-hosted" && mode !== "review" && mode !== "review-cloudflare") return;
      const forbidden = [
        /\/features\/admin\//,
        /\/features\/checkout\/repository\.ts$/,
        /\/features\/checkout\/receipt\.ts$/,
        /\/pages\/CheckoutPage\.tsx$/,
      ];
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        for (const id of Object.keys(output.modules)) {
          const normalized = id.replaceAll("\\", "/");
          if (forbidden.some((pattern) => pattern.test(normalized))) {
            throw new Error(`Review artifact includes live-only module: ${normalized}`);
          }
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  if (mode === "review-cloudflare" && !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.pages\.dev$/.test(process.env.VITE_REVIEW_HOSTNAME ?? "")) {
    throw new Error("review-cloudflare requires an exact VITE_REVIEW_HOSTNAME under pages.dev");
  }
  return {
    base: mode === "review-cloudflare" ? "/" : mode === "review-hosted" ? "/lumea-review-preview/" : "/lumea-flower-studio/",
    build: {
      outDir: mode === "review-cloudflare" ? "dist-review-cloudflare" : mode === "review-hosted" ? "dist-review" : mode === "review" ? "dist-review-local" : "dist",
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/@supabase/")) return "supabase";
            if (id.includes("node_modules/gsap/") || id.includes("node_modules/@gsap/")) return "motion";
            if (
              id.includes("node_modules/react/")
              || id.includes("node_modules/react-dom/")
              || id.includes("node_modules/react-router-dom/")
              || id.includes("node_modules/react-router/")
            ) return "react";
            return undefined;
          },
        },
      },
    },
    plugins: [react(), reviewImportBoundary(mode), githubPagesRouteEntries(mode)],
  };
});
