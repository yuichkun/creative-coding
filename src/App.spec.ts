import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";

import App from "./App.vue";
import rootReadme from "../README.md?raw";
import validProjectReadme from "./portfolio/__tests__/fixtures/valid-project-readme.md?raw";
import { parsePortfolioHomepageModel } from "./portfolio/homepage";
import { buildProjectDetailPage } from "./portfolio/readmeContracts";
import { getProjectDetailPath } from "./portfolio/routes";

describe("App", () => {
  it("exports a Vue component", () => {
    expect(App).toBeTruthy();
  });

  it("renders a Japanese homepage shell with the README hierarchy", async () => {
    const homepage = parsePortfolioHomepageModel(rootReadme);
    const html = await renderToString(
      createSSRApp(App, {
        siteData: {
          homepage,
          detailRoutes: [],
        },
        route: { type: "home" as const },
      }),
    );

    expect(html).toContain("作品目録");
    expect(html).toContain("作品一覧");
    expect(html).toContain("分野");
    expect(html).toContain("小分類");
    expect(html).toContain("Cycling &#39;74 Max");
    expect(html).toContain("Single Motion Granular");
  });

  it("renders root-derived detail headers together with the parsed README body", async () => {
    const homepage = parsePortfolioHomepageModel(rootReadme);
    const project = homepage.projects.find((candidate) => candidate.title === "Layered Pixelation");

    expect(project).toBeDefined();

    const detailPage = buildProjectDetailPage(
      project!,
      validProjectReadme,
      "/workspace/prototypes/layered-pixelation/README.md",
    );
    const route = {
      type: "detail" as const,
      routeId: project!.routeId,
      path: getProjectDetailPath(project!.routeId),
      detailPage,
    };
    const html = await renderToString(
      createSSRApp(App, {
        siteData: {
          homepage,
          detailRoutes: [{ routeId: route.routeId, path: route.path, detailPage }],
        },
        route,
      }),
    );

    expect(html).toContain(
      "Interactive WebGL experiment with dynamic pixelation effects and mouse-based distortion.",
    );
    expect(html).toContain("ルート README 由来");
    expect(html).toContain("README 本文");
    expect(html).toContain("プロジェクト README の本文");
    expect(html).toContain("https://layered-pixelation.vercel.app/");
    expect(html).toContain("https://layered-pixelation-detail.example.com/");
    expect(html).toContain(
      "This detailed README content should drive the detail page instead of the homepage summary.",
    );
    expect(html).not.toContain("&lt;pre class=&quot;detail-markdown&quot;&gt;");
  });
});
