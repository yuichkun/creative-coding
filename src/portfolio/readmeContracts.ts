import { parsePortfolioHomepageModel } from "./homepage";
import { buildProjectActionLinks } from "./links";
import { getLocalProjectReadmeManifest, getProjectReadmeLoader } from "./localReadmes";
import { renderProjectMarkdown } from "./markdown";
import { normalizeReadmeMedia } from "./media";
import { slugifyHeading } from "./routes";
import type {
  HomepageProject,
  InternalReadmeRoute,
  LocalProjectReadmeManifestEntry,
  ProjectDetailPage,
  ProjectReadmeResolverOptions,
} from "./types";

export type {
  HomepageGroup,
  HomepageProject,
  HomepageSection,
  HomepageSubsection,
  InternalReadmeRoute,
  LocalProjectReadmeManifestEntry,
  PortfolioHomepage,
  PortfolioLink,
  PortfolioLinkType,
  ProjectDetailPage,
} from "./types";
export {
  getPortfolioLinkType,
  normalizePortfolioLink,
  normalizePortfolioLinkLabel,
  parsePortfolioHomepageModel,
} from "./homepage";
export { slugifyHeading } from "./routes";

const CANONICAL_README_BASENAME = "README.md";
const DEFAULT_WORKSPACE_ROOT = "/workspace";

export function parsePortfolioHomepage(readme: string): HomepageProject[] {
  return parsePortfolioHomepageModel(readme).projects;
}

function getDefaultFileExists(filePath: string): Promise<boolean> {
  return Promise.resolve(getProjectReadmeLoader(filePath) !== null);
}

function isRelativeUrl(url: string): boolean {
  return !/^[a-z]+:/i.test(url) && !url.startsWith("//");
}

function isCanonicalRelativeProjectReadmePath(relativePath: string): boolean {
  const normalizedPath = toWorkspaceRelativeReadmePath(relativePath);
  const segments = normalizedPath.split("/").filter(Boolean);

  return (
    segments.length === 3 &&
    segments[0] === "prototypes" &&
    segments[2] === CANONICAL_README_BASENAME
  );
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function toWorkspaceRelativeReadmePath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^\/workspace\//, "")
    .replace(/^\.\//, "");
}

function toWorkspaceAbsoluteReadmePath(relativePath: string, workspaceRoot: string): string {
  return `${trimTrailingSlash(workspaceRoot)}/${toWorkspaceRelativeReadmePath(relativePath)}`;
}

function getProjectLearnMoreLink(project: HomepageProject) {
  return project.links.find((link) => link.type === "learn-more") ?? null;
}

function extractRepositorySlug(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, "");
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
      return null;
    }

    const readmeIndex = segments.findIndex((segment) => /^README\.md$/i.test(segment));

    if (readmeIndex >= 1) {
      return segments[readmeIndex - 1] ?? null;
    }

    const blobOrTreeIndex = segments.findIndex(
      (segment) => segment === "blob" || segment === "tree",
    );

    if (blobOrTreeIndex >= 1) {
      return segments[blobOrTreeIndex - 1] ?? null;
    }

    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

function dedupeManifestEntries(
  entries: LocalProjectReadmeManifestEntry[],
): LocalProjectReadmeManifestEntry[] {
  return Array.from(new Map(entries.map((entry) => [entry.readmePath, entry])).values());
}

function resolveUniqueManifestMatch(
  entries: LocalProjectReadmeManifestEntry[],
  reason: string,
  project: HomepageProject,
): LocalProjectReadmeManifestEntry | null {
  const matches = dedupeManifestEntries(entries);

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    throw new Error(
      `Ambiguous local README resolution for "${project.title}" via ${reason}: ${matches
        .map((match) => match.readmePath)
        .join(", ")}`,
    );
  }

  return matches[0] ?? null;
}

function getLocalReadmeManifest(
  options: ProjectReadmeResolverOptions,
): LocalProjectReadmeManifestEntry[] {
  return options.localReadmes ?? getLocalProjectReadmeManifest();
}

function buildFallbackContentMarkdown(project: HomepageProject): string {
  const parts: string[] = [];

  if (project.media.length > 0) {
    parts.push(project.media.map((item) => `![${item.alt}](${item.url})`).join("\n"));
  }

  if (project.links.length > 0) {
    parts.push(project.links.map((link) => `[${link.label}](${link.url})`).join(" • "));
  }

  if (project.summary) {
    parts.push(project.summary);
  }

  return parts.join("\n\n").trim();
}

export async function buildFallbackProjectDetailPage(
  project: HomepageProject,
): Promise<ProjectDetailPage> {
  const contentMarkdown = buildFallbackContentMarkdown(project);
  const actionLinks = buildProjectActionLinks(project, {
    detailPath: project.detailPath,
    resolvedReadmePath: null,
    internalReadmeRoutes: [],
  });

  return {
    detailPath: project.detailPath,
    title: project.title,
    summary: project.summary,
    primaryLink: project.primaryLink,
    links: project.links,
    actionLinks,
    media: project.media,
    imageUrls: project.imageUrls,
    contentMarkdown,
    contentHtml: await renderProjectMarkdown(contentMarkdown, {
      readmePath: `${DEFAULT_WORKSPACE_ROOT}/README.md`,
      internalReadmeRoutes: [],
    }),
    resolvedReadmePath: null,
    source: "homepage-fallback",
  };
}

export function buildInternalReadmeRoutes(
  projects: HomepageProject[],
  resolvedReadmePaths: Array<string | null>,
): InternalReadmeRoute[] {
  const routesByReadmePath = new Map<string, InternalReadmeRoute>();

  projects.forEach((project, index) => {
    const readmePath = resolvedReadmePaths[index];

    if (!readmePath) {
      return;
    }

    const existingRoute = routesByReadmePath.get(readmePath);

    if (existingRoute && existingRoute.routeId !== project.routeId) {
      throw new Error(
        `Ambiguous internal detail route for local README ${readmePath}: ${existingRoute.routeId}, ${project.routeId}`,
      );
    }

    routesByReadmePath.set(readmePath, {
      readmePath,
      routeId: project.routeId,
      detailPath: project.detailPath,
      title: project.title,
    });
  });

  return [...routesByReadmePath.values()];
}

export async function resolveProjectReadmePath(
  project: HomepageProject,
  options: ProjectReadmeResolverOptions = {},
): Promise<string | null> {
  const workspaceRoot = options.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT;
  const fileExists = options.fileExists ?? getDefaultFileExists;
  const localReadmes = getLocalReadmeManifest(options);
  const learnMoreLink = getProjectLearnMoreLink(project);

  if (learnMoreLink && isRelativeUrl(learnMoreLink.url)) {
    const relativePath = learnMoreLink.url.replace(/\\/g, "/");

    if (isCanonicalRelativeProjectReadmePath(relativePath)) {
      const linkedReadmePath = toWorkspaceAbsoluteReadmePath(relativePath, workspaceRoot);

      if (await fileExists(linkedReadmePath)) {
        return linkedReadmePath;
      }
    }
  }

  const repositorySlug =
    learnMoreLink && !isRelativeUrl(learnMoreLink.url)
      ? extractRepositorySlug(learnMoreLink.url)
      : null;
  const projectSlug = project.routeId;
  const projectTitleSlug = slugifyHeading(project.title);

  const repositoryMatch = resolveUniqueManifestMatch(
    repositorySlug
      ? localReadmes.filter(
          (entry) =>
            entry.folder === repositorySlug || entry.folderSlug === slugifyHeading(repositorySlug),
        )
      : [],
    "learn-more repository slug",
    project,
  );

  if (repositoryMatch) {
    return repositoryMatch.readmePath;
  }

  const slugMatch = resolveUniqueManifestMatch(
    localReadmes.filter(
      (entry) => entry.folder === projectSlug || entry.folderSlug === projectSlug,
    ),
    "homepage route slug",
    project,
  );

  if (slugMatch) {
    return slugMatch.readmePath;
  }

  const titleMatch = resolveUniqueManifestMatch(
    localReadmes.filter((entry) => entry.titleSlug === projectTitleSlug),
    "README title",
    project,
  );

  return titleMatch?.readmePath ?? null;
}

export async function buildProjectDetailPage(
  project: HomepageProject,
  projectReadme: string | null | undefined,
  readmePath = `${DEFAULT_WORKSPACE_ROOT}/README.md`,
  options: ProjectReadmeResolverOptions = {},
): Promise<ProjectDetailPage> {
  if (!projectReadme) {
    return buildFallbackProjectDetailPage(project);
  }

  const normalizedMedia = normalizeReadmeMedia(
    projectReadme,
    readmePath,
  );
  const contentMarkdown = normalizedMedia.contentMarkdown.trim();
  const resolvedReadmePath = options.resolvedReadmePath ?? readmePath;
  const actionLinks = buildProjectActionLinks(project, {
    detailPath: project.detailPath,
    resolvedReadmePath,
    internalReadmeRoutes: options.internalReadmeRoutes ?? [],
  });

  return {
    detailPath: project.detailPath,
    title: project.title,
    summary: project.summary,
    primaryLink: project.primaryLink,
    links: project.links,
    actionLinks,
    media: normalizedMedia.media.length > 0 ? normalizedMedia.media : project.media,
    imageUrls: normalizedMedia.imageUrls.length > 0 ? normalizedMedia.imageUrls : project.imageUrls,
    contentMarkdown,
    contentHtml: await renderProjectMarkdown(contentMarkdown, {
      readmePath,
      internalReadmeRoutes: options.internalReadmeRoutes ?? [],
    }),
    resolvedReadmePath,
    source: "project-readme",
  };
}

export async function resolveProjectDetailPage(
  project: HomepageProject,
  options: ProjectReadmeResolverOptions = {},
): Promise<ProjectDetailPage> {
  const readProjectReadme =
    options.readFile ??
    (async (filePath: string) => {
      const loader = getProjectReadmeLoader(filePath);

      if (!loader) {
        throw new Error(`Missing canonical project README loader for ${filePath}`);
      }

      return loader();
    });
  const readmePath = await resolveProjectReadmePath(project, options);

  if (!readmePath) {
    return buildFallbackProjectDetailPage(project);
  }

  const readme = await readProjectReadme(readmePath);
  return buildProjectDetailPage(project, readme, readmePath, {
    ...options,
    resolvedReadmePath: readmePath,
  });
}
