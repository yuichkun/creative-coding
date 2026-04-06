import rootReadme from "../../README.md?raw";

import { applyResolvedProjectMetadata } from "./links";
import { getLocalProjectReadmeManifest } from "./localReadmes";
import { renderProjectMarkdown } from "./markdown";
import {
  buildInternalReadmeRoutes,
  parsePortfolioHomepageModel,
  resolveProjectDetailPage,
  resolveProjectReadmePath,
} from "./readmeContracts";
import type { HomepageGroup, PortfolioHomepage, ProjectDetailPage } from "./types";

const ROOT_README_PATH = "/workspace/README.md";

function extractDocumentTitle(readme: string): string {
  return readme.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Portfolio";
}

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

function enrichHomepageGroup(
  group: HomepageGroup,
  projectsByRouteId: Map<string, PortfolioHomepage["projects"][number]>,
): HomepageGroup {
  return {
    ...group,
    projects: group.projects.map((project) => projectsByRouteId.get(project.routeId) ?? project),
    groups: group.groups.map((childGroup) => enrichHomepageGroup(childGroup, projectsByRouteId)),
  };
}

function buildHomepageLinkRewrites(projects: PortfolioHomepage["projects"]): Record<string, string> {
  return projects.reduce<Record<string, string>>((rewrites, project) => {
    project.actionLinks.forEach((link) => {
      if (link.destinationKind === "internal-detail" && link.sourceUrl && link.href) {
        rewrites[link.sourceUrl] = link.href;
      }
    });

    return rewrites;
  }, {});
}

export async function buildPortfolioSiteData(): Promise<PortfolioSiteData> {
  const homepage = parsePortfolioHomepageModel(rootReadme);
  const localReadmes = getLocalProjectReadmeManifest();
  const resolvedReadmePaths = await Promise.all(
    homepage.projects.map((project) => resolveProjectReadmePath(project, { localReadmes })),
  );
  const internalReadmeRoutes = buildInternalReadmeRoutes(homepage.projects, resolvedReadmePaths);
  const enrichedProjects = homepage.projects.map((project, index) =>
    applyResolvedProjectMetadata(project, resolvedReadmePaths[index] ?? null, internalReadmeRoutes),
  );
  const projectsByRouteId = new Map(enrichedProjects.map((project) => [project.routeId, project]));
  const explicitLinkRewrites = buildHomepageLinkRewrites(enrichedProjects);
  const documentHtml = await renderProjectMarkdown(rootReadme, {
    readmePath: ROOT_README_PATH,
    internalReadmeRoutes,
    explicitLinkRewrites,
  });
  const enrichedHomepage: PortfolioHomepage = {
    documentTitle: extractDocumentTitle(rootReadme),
    documentMarkdown: rootReadme,
    documentHtml,
    projects: enrichedProjects,
    sections: homepage.sections.map((section) => ({
      ...section,
      projects: section.projects.map(
        (project) => projectsByRouteId.get(project.routeId) ?? project,
      ),
      subsections: section.subsections.map((subsection) => ({
        ...subsection,
        projects: subsection.projects.map(
          (project) => projectsByRouteId.get(project.routeId) ?? project,
        ),
        groups: subsection.groups.map((group) => enrichHomepageGroup(group, projectsByRouteId)),
      })),
      groups: section.groups.map((group) => enrichHomepageGroup(group, projectsByRouteId)),
    })),
  };
  const detailRoutes = await Promise.all(
    enrichedProjects.map(async (project, index) => ({
      routeId: project.routeId,
      path: project.detailPath,
      detailPage: await resolveProjectDetailPage(project, {
        localReadmes,
        internalReadmeRoutes,
        resolvedReadmePath: resolvedReadmePaths[index] ?? null,
      }),
    })),
  );

  return {
    homepage: enrichedHomepage,
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
