import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";

import App from "./App.vue";
import rootReadme from "../README.md?raw";
import validProjectReadme from "./portfolio/__tests__/fixtures/valid-project-readme.md?raw";
import { parsePortfolioHomepageModel } from "./portfolio/homepage";
import { renderProjectMarkdown } from "./portfolio/markdown";
import { buildProjectDetailPage } from "./portfolio/readmeContracts";
import { getProjectDetailPath } from "./portfolio/routes";

describe("App", () => {
  it("exports a Vue component", () => {
    expect(App).toBeTruthy();
  });

  it("renders the root README flow on the homepage instead of a synthetic project catalog", async () => {
    const homepage = parsePortfolioHomepageModel(rootReadme);
    homepage.documentHtml = await renderProjectMarkdown(rootReadme, {
      readmePath: "/workspace/README.md",
      internalReadmeRoutes: [
        {
          readmePath: "/workspace/prototypes/layered-pixelation/README.md",
          routeId: "layered-pixelation",
          detailPath: "/projects/layered-pixelation/",
          title: "Layered Pixelation",
        },
        {
          readmePath: "/workspace/prototypes/kodama-vst/README.md",
          routeId: "kodama",
          detailPath: "/projects/kodama/",
          title: "Kodama",
        },
      ],
      explicitLinkRewrites: {
        "https://github.com/yuichkun/kodama-vst": "/projects/kodama/",
      },
    });
    const html = await renderToString(
      createSSRApp(App, {
        siteData: {
          homepage,
          detailRoutes: [],
        },
        route: { type: "home" as const },
      }),
    );

    expect(html).toContain("Portfolio");
    expect(html).toContain("⚡ Code + Art");
    expect(html).toContain("Creative coding projects by");
    expect(html).toContain('href="#audio"');
    expect(html).toContain("Cycling '74 Max");
    expect(html).toContain("Single Motion Granular");
    expect(html).toContain('href="/projects/layered-pixelation/"');
    expect(html).toContain('href="/projects/kodama/"');
    expect(html).not.toContain('href="https://github.com/yuichkun/kodama-vst"');
    expect(html).toContain(
      "https://raw.githubusercontent.com/yuichkun/kentaro-granular-web/master/single-motion-granular.gif",
    );
    expect(html).not.toContain("Category");
    expect(html).not.toContain("Section");
    expect(html).not.toContain("View project");
  });

  it("renders the project README as the primary detail-page structure", async () => {
    const homepage = parsePortfolioHomepageModel(rootReadme);
    const project = homepage.projects.find((candidate) => candidate.title === "Layered Pixelation");

    expect(project).toBeDefined();

    const detailPage = await buildProjectDetailPage(
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

    expect(html).toContain('<h1 id="layered-pixelation">Layered Pixelation</h1>');
    expect(html).toContain("🔗 Demo");
    expect(html).toContain("https://layered-pixelation-detail.example.com/");
    expect(html).toContain(
      "This detailed README content should drive the detail page instead of the homepage summary.",
    );
    expect(html).toContain("README");
    expect(html).not.toContain("Project details");
    expect(html).not.toContain("Overview and links");
    expect(html).not.toContain("Gallery");
    expect(html).not.toContain("Project gallery");
    expect(html).not.toContain("Project write-up");
    expect(html).not.toContain("About this project");
    expect(html).not.toContain("Detailed project write-up");
    expect(html).not.toContain("Portfolio overview currently available");
    expect(html).not.toContain("root README derived");
    expect(html).not.toContain("&lt;pre class=&quot;detail-markdown&quot;&gt;");
  });
});
