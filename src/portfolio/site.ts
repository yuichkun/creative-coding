import rootReadme from "../../README.md?raw";

import { parsePortfolioHomepageModel, resolveProjectDetailPage } from "./readmeContracts";
import { getProjectDetailPath } from "./routes";
import type { PortfolioHomepage, ProjectDetailPage } from "./types";

export interface PortfolioDetailRoute {
  routeId: string;
  path: string;
  detailPage: ProjectDetailPage;
}

export interface PortfolioSiteData {
  homepage: PortfolioHomepage;
  detailRoutes: PortfolioDetailRoute[];
}

export type PortfolioMatchedRoute =
  | { type: "home" }
  | { type: "detail"; routeId: string; path: string; detailPage: ProjectDetailPage }
  | { type: "not-found"; path: string };

export async function buildPortfolioSiteData(): Promise<PortfolioSiteData> {
  const homepage = parsePortfolioHomepageModel(rootReadme);
  const detailRoutes = await Promise.all(
    homepage.projects.map(async (project) => ({
      routeId: project.routeId,
      path: getProjectDetailPath(project.routeId),
      detailPage: await resolveProjectDetailPage(project),
    })),
  );

  return {
    homepage,
    detailRoutes,
  };
}

function normalizePathname(pathname: string): string {
  if (pathname === "") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function matchPortfolioRoute(
  pathname: string,
  siteData: PortfolioSiteData,
): PortfolioMatchedRoute {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === "/") {
    return { type: "home" };
  }

  const detailRoute = siteData.detailRoutes.find((route) => route.path === normalizedPathname);

  if (!detailRoute) {
    return {
      type: "not-found",
      path: normalizedPathname,
    };
  }

  return {
    type: "detail",
    routeId: detailRoute.routeId,
    path: detailRoute.path,
    detailPage: detailRoute.detailPage,
  };
}
