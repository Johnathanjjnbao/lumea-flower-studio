import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { products } from "./src/data/content";

function githubPagesRouteEntries(): Plugin {
  return {
    name: "github-pages-route-entries",
    apply: "build",
    async closeBundle() {
      const outputDirectory = resolve(process.cwd(), "dist");
      const appShell = await readFile(resolve(outputDirectory, "index.html"), "utf8");
      const routes = [
        "flowers",
        "create-bouquet",
        "ko",
        "ko/flowers",
        "ko/create-bouquet",
        ...products.map((product) => `flowers/${product.slug}`),
        ...products.map((product) => `ko/flowers/${product.slug}`),
      ];

      await Promise.all(routes.map(async (route) => {
        const routeDirectory = resolve(outputDirectory, route);
        await mkdir(routeDirectory, { recursive: true });
        await writeFile(resolve(routeDirectory, "index.html"), appShell);
      }));
      await writeFile(resolve(outputDirectory, "404.html"), appShell);
    },
  };
}

export default defineConfig({
  base: "/lumea-flower-studio/",
  plugins: [react(), githubPagesRouteEntries()],
});
