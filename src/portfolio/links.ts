import { isExternalUrl, resolveReadmeRelativePath, toWorkspaceRelativePath } from "./media";
import type { HomepageProject, InternalReadmeRoute, PortfolioLink } from "./types";

const ROOT_README_PATH = "/workspace/README.md";

interface ResolvedLocalTarget {
  workspacePath: string;
  hash: string;
}

interface ProjectActionLinkOptions {
  detailPath: string;
  resolvedReadmePath: string | null;
  internalReadmeRoutes: InternalReadmeRoute[];
  sourceReadmePath?: string;
}

function splitHash(url: string): { path: string; hash: string } {
  const hashIndex = url.indexOf("#");

  if (hashIndex < 0) {
    return { path: url, hash: "" };
  }

  return {
    path: url.slice(0, hashIndex),
    hash: url.slice(hashIndex),
  };
}

export function resolveLocalLinkTarget(
  url: string,
  readmePath: string,
): ResolvedLocalTarget | null {
  if (isExternalUrl(url) || url.startsWith("#")) {
    return null;
  }

  const { path, hash } = splitHash(url);

  if (path.trim().length === 0) {
    return null;
  }

  return {
    workspacePath: `/workspace/${resolveReadmeRelativePath(readmePath, path)}`,
    hash,
  };
}

export function findInternalReadmeRoute(
  workspacePath: string,
  internalReadmeRoutes: InternalReadmeRoute[],
): InternalReadmeRoute | null {
  return internalReadmeRoutes.find((route) => route.readmePath === workspacePath) ?? null;
}

export function resolvePortfolioLink(
  link: PortfolioLink,
  options: ProjectActionLinkOptions,
): PortfolioLink {
  const sourceUrl = link.url;

  if (link.type === "learn-more" && options.resolvedReadmePath) {
    return {
      ...link,
      href: options.detailPath,
      sourceUrl,
      destinationKind: "internal-detail",
      routeId: link.routeId,
      workspacePath: options.resolvedReadmePath,
    };
  }

  const localTarget = resolveLocalLinkTarget(sourceUrl, options.sourceReadmePath ?? ROOT_README_PATH);

  if (!localTarget) {
    return {
      ...link,
      href: sourceUrl,
      sourceUrl,
      destinationKind: "external",
    };
  }

  const internalRoute = findInternalReadmeRoute(localTarget.workspacePath, options.internalReadmeRoutes);

  if (internalRoute) {
    return {
      ...link,
      href: `${internalRoute.detailPath}${localTarget.hash}`,
      sourceUrl,
      destinationKind: "internal-detail",
      routeId: internalRoute.routeId,
      workspacePath: localTarget.workspacePath,
    };
  }

  return {
    ...link,
    href: `/${toWorkspaceRelativePath(localTarget.workspacePath)}${localTarget.hash}`,
    sourceUrl,
    destinationKind: "local-doc",
    workspacePath: localTarget.workspacePath,
  };
}

export function buildProjectActionLinks(
  project: HomepageProject,
  options: ProjectActionLinkOptions,
): PortfolioLink[] {
  return project.links.map((link) =>
    resolvePortfolioLink(
      {
        ...link,
        routeId: project.routeId,
      },
      options,
    ),
  );
}

export function applyResolvedProjectMetadata(
  project: HomepageProject,
  resolvedReadmePath: string | null,
  internalReadmeRoutes: InternalReadmeRoute[],
): HomepageProject {
  const actionLinks = buildProjectActionLinks(project, {
    detailPath: project.detailPath,
    resolvedReadmePath,
    internalReadmeRoutes,
  });

  return {
    ...project,
    resolvedReadmePath,
    primaryLink:
      project.primaryLink === null
        ? null
        : actionLinks.find((link) => link.label === project.primaryLink?.label && link.url === project.primaryLink?.url) ??
          project.primaryLink,
    actionLinks,
  };
}
