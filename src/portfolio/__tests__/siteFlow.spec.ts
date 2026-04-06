import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";

import App from "../../App.vue";
import { buildPortfolioSiteData, matchPortfolioRoute, type PortfolioMatchedRoute } from "../site";

async function renderPortfolioPath(pathname: string) {
  const siteData = await buildPortfolioSiteData();
  const route = matchPortfolioRoute(pathname, siteData);

  expect(route.type).not.toBe("not-found");

  const html = await renderToString(
    createSSRApp(App, {
      siteData,
      route: route as Exclude<PortfolioMatchedRoute, { type: "not-found" }>,
    }),
  );

  return { siteData, route, html };
}

describe("portfolio site flow", () => {
  it("renders the homepage project cards in README order with direct detail links", async () => {
    const { siteData, route, html } = await renderPortfolioPath("/");

    expect(route).toStrictEqual({ type: "home" });
    expect(html).toContain("作品一覧");
    expect(html).toContain("README の階層順をそのまま保ち");

    const renderedRouteIds = Array.from(
      html.matchAll(/href="\/projects\/([^"/]+)\/"/g),
      (match) => match[1],
    );
    const renderedProjectOrder = siteData.homepage.sections.flatMap((section) => [
      ...section.projects,
      ...section.subsections.flatMap((subsection) => subsection.projects),
    ]);

    expect(renderedRouteIds).toStrictEqual(renderedProjectOrder.map((project) => project.routeId));
    expect(renderedRouteIds).toContain("layered-pixelation");
    expect(renderedRouteIds).toContain("kokuyo-design-award-2022-virtual-trophy");
  });

  it("navigates from the homepage to the local README-backed Layered Pixelation detail route", async () => {
    const { route, html } = await renderPortfolioPath("/projects/layered-pixelation/");

    expect(route).toMatchObject({
      type: "detail",
      routeId: "layered-pixelation",
      path: "/projects/layered-pixelation/",
      detailPage: {
        title: "Layered Pixelation",
        source: "project-readme",
        summary:
          "Interactive WebGL experiment with dynamic pixelation effects and mouse-based distortion.",
      },
    });
    expect(html).toContain("Visuals");
    expect(html).toContain("プロジェクト README の本文");
    expect(html).toContain(
      "Interactive WebGL experiment with dynamic pixelation effects and mouse-based distortion.",
    );
    expect(html).toContain(
      "An interactive WebGL experiment that creates a mesmerizing layered pixelation effect using custom shaders.",
    );
    expect(html).toContain("Interactive mouse-based distortion");
    expect(html).toContain("Custom GLSL Shaders");
    expect(html).toContain('href="https://layered-pixelation.vercel.app/"');
  });

  it("renders the Kokuyo fallback detail route from root README metadata when no local README is available", async () => {
    const { route, html } = await renderPortfolioPath(
      "/projects/kokuyo-design-award-2022-virtual-trophy/",
    );

    expect(route).toMatchObject({
      type: "detail",
      routeId: "kokuyo-design-award-2022-virtual-trophy",
      path: "/projects/kokuyo-design-award-2022-virtual-trophy/",
      detailPage: {
        title: "Kokuyo Design Award 2022 Virtual Trophy",
        source: "homepage-fallback",
      },
    });
    expect(html).toContain("Visuals");
    expect(html).toContain("ルート README 由来の代替本文");
    expect(html).toContain(
      "A [Next.js](https://nextjs.org/)-based 3D trophy viewer that displays time-evolving models using [model-viewer](https://modelviewer.dev/). Features daily model transitions with extensive [Playwright](https://playwright.dev/) testing to ensure consistent rendering across 366 days.",
    );
    expect(html).toContain('href="https://www.kokuyo.co.jp/trophy2022/"');
    expect(html).toContain(
      'href="https://yogo-management-office.com/works/kokuyo-design-award-2022"',
    );
    expect(html).not.toContain("プロジェクト README の本文");
  });
});
