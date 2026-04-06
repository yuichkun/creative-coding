import { describe, expect, it } from "vitest";

import rootReadme from "../../../README.md?raw";

import { parsePortfolioHomepageModel } from "../homepage";
import { collectPortfolioProjectRoutes, getProjectDetailPath } from "../routes";
import { buildPortfolioSiteData, matchPortfolioRoute } from "../site";

describe("static portfolio routes", () => {
  it("derives one concrete detail path per homepage project", () => {
    const homepage = parsePortfolioHomepageModel(rootReadme);
    const projectRoutes = collectPortfolioProjectRoutes(rootReadme);

    expect(projectRoutes).toHaveLength(homepage.projects.length);
    expect(projectRoutes.map((route) => route.routeId)).toStrictEqual(
      homepage.projects.map((project) => project.routeId),
    );
    expect(projectRoutes.map((route) => route.path)).toStrictEqual(
      homepage.projects.map((project) => getProjectDetailPath(project.routeId)),
    );
    expect(projectRoutes[0]).toStrictEqual({
      title: "Single Motion Granular",
      routeId: "single-motion-granular",
      path: "/projects/single-motion-granular/",
    });
    expect(projectRoutes.at(-1)).toStrictEqual({
      title: "Reference Graph",
      routeId: "reference-graph",
      path: "/projects/reference-graph/",
    });
  });

  it("builds detail routes for both canonical README and fallback-detail projects", async () => {
    const siteData = await buildPortfolioSiteData();
    const layeredPixelationRoute = siteData.detailRoutes.find(
      (route) => route.routeId === "layered-pixelation",
    );
    const kokuyoRoute = siteData.detailRoutes.find(
      (route) => route.routeId === "kokuyo-design-award-2022-virtual-trophy",
    );

    expect(siteData.detailRoutes).toHaveLength(siteData.homepage.projects.length);
    expect(layeredPixelationRoute).toMatchObject({
      path: "/projects/layered-pixelation/",
      detailPage: {
        title: "Layered Pixelation",
        source: "project-readme",
      },
    });
    expect(kokuyoRoute).toMatchObject({
      path: "/projects/kokuyo-design-award-2022-virtual-trophy/",
      detailPage: {
        title: "Kokuyo Design Award 2022 Virtual Trophy",
        source: "homepage-fallback",
      },
    });
  });

  it("matches direct detail paths without relying on a client-side router", async () => {
    const siteData = await buildPortfolioSiteData();

    expect(matchPortfolioRoute("/", siteData)).toStrictEqual({ type: "home" });
    expect(matchPortfolioRoute("/projects/layered-pixelation/", siteData)).toMatchObject({
      type: "detail",
      routeId: "layered-pixelation",
      path: "/projects/layered-pixelation/",
      detailPage: {
        title: "Layered Pixelation",
      },
    });
    expect(
      matchPortfolioRoute("/projects/kokuyo-design-award-2022-virtual-trophy/", siteData),
    ).toMatchObject({
      type: "detail",
      routeId: "kokuyo-design-award-2022-virtual-trophy",
      path: "/projects/kokuyo-design-award-2022-virtual-trophy/",
      detailPage: {
        source: "homepage-fallback",
      },
    });
  });
});
