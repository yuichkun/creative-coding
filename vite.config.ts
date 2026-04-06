import { defineConfig } from "vite-plus";
import vue from "@vitejs/plugin-vue";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { collectPortfolioProjectRoutes } from "./src/portfolio/routes.ts";

function cloneStaticPortfolioDetailPages() {
  const rootReadme = readFileSync(new URL("./README.md", import.meta.url), "utf8");
  const detailRoutes = collectPortfolioProjectRoutes(rootReadme);
  let outDir = "dist";

  return {
    name: "clone-static-portfolio-detail-pages",
    apply: "build" as const,
    configResolved(config: { build: { outDir: string } }) {
      outDir = config.build.outDir;
    },
    writeBundle() {
      const indexHtml = readFileSync(join(outDir, "index.html"), "utf8");

      for (const route of detailRoutes) {
        const detailDirectory = join(outDir, route.path.replace(/^\//, ""));

        mkdirSync(detailDirectory, { recursive: true });
        writeFileSync(join(detailDirectory, "index.html"), indexHtml);
      }
    },
  };
}

export default defineConfig({
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [vue(), cloneStaticPortfolioDetailPages()],
  test: {
    include: ["src/**/*.spec.ts"],
  },
});
