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
  it("renders the root README opening flow on the homepage with authored order and internal rewrites where available", async () => {
    const { siteData, route, html } = await renderPortfolioPath("/");

    expect(route).toStrictEqual({ type: "home" });
    expect(html).toContain("⚡ Code + Art");
    expect(html).toContain("Creative coding projects by");
    expect(html).toContain('href="#audio"');
    expect(html).toContain('href="#visuals"');
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/yuichkun/kentaro-granular-web/master/single-motion-granular.gif"',
    );
    expect(html.indexOf("⚡ Code + Art")).toBeLessThan(html.indexOf("Audio"));
    expect(html.indexOf("Audio")).toBeLessThan(html.indexOf("Visuals"));
    expect(html).toContain('href="/projects/layered-pixelation/"');
    expect(html).toContain('href="/projects/kodama/"');
    expect(html).toContain('href="/projects/interval-explorer/"');
    expect(html).toContain('href="/projects/reference-graph/"');
    expect(html).not.toContain('href="https://github.com/yuichkun/kodama-vst"');
    expect(html).not.toContain('href="https://github.com/yuichkun/interval-explorer"');
    expect(html).not.toContain('href="https://github.com/yuichkun/reference-graph"');
    expect(html).toContain('src="/assets/kokuyo-design-award-2022.gif"');
    expect(html).not.toContain("portfolio index");
    expect(html).not.toContain("View project");
    expect(siteData.homepage.documentTitle).toBe("⚡ Code + Art");
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
    expect(html).toContain("Portfolio");
    expect(html).toContain('<h1 id="layered-pixelation">Layered Pixelation</h1>');
    expect(html).toContain("Demo:");
    expect(html).toContain(
      "An interactive WebGL experiment that creates a mesmerizing layered pixelation effect using custom shaders.",
    );
    expect(html).toContain("Interactive mouse-based distortion");
    expect(html).toContain("Custom GLSL Shaders");
    expect(html).toContain('href="https://layered-pixelation.vercel.app/"');
    expect(html).not.toContain("Project details");
    expect(html).not.toContain("Overview and links");
    expect(html).not.toContain("About this project");
    expect(html).not.toContain("Detailed project write-up");
    expect(html).not.toContain("Project gallery");
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
    expect(html).toContain("Portfolio");
    expect(html).toContain("🔗 Demo");
    expect(html).toContain("📝 Learn more");
    expect(html).toContain(
      "A <a href=\"https://nextjs.org/\">Next.js</a>-based 3D trophy viewer that displays time-evolving models using <a href=\"https://modelviewer.dev/\">model-viewer</a>. Features daily model transitions with extensive <a href=\"https://playwright.dev/\">Playwright</a> testing to ensure consistent rendering across 366 days.",
    );
    expect(html).toContain('href="https://www.kokuyo.co.jp/trophy2022/"');
    expect(html).toContain(
      'href="https://yogo-management-office.com/works/kokuyo-design-award-2022"',
    );
    expect(html).not.toContain("Project details");
    expect(html).not.toContain("Overview and links");
    expect(html).not.toContain("About this project");
    expect(html).not.toContain("Detailed project write-up");
    expect(html).not.toContain("Portfolio overview currently available");
  });
});
