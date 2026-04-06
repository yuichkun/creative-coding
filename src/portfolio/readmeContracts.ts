import { parsePortfolioHomepageModel } from "./homepage";
import { normalizeReadmeMedia } from "./media";
import { normalizeLineEndings } from "./routes";
import type { HomepageProject, ProjectDetailPage, ProjectReadmeResolverOptions } from "./types";

export type {
  HomepageProject,
  HomepageSection,
  HomepageSubsection,
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
const CANONICAL_PROJECT_READMES = import.meta.glob("../../prototypes/*/README.md", {
  query: "?raw",
  import: "default",
});
const EXPLICIT_PROJECT_FOLDER_OVERRIDES: Record<string, string> = {
  "Single Motion Granular": "single-motion-granular",
  "PoseNet for Max": "n4m-posenet",
  "Web Audio Pitch Dropper": "pitch-dropper",
  "Building Audio Apps with JavaScript": "building-audio-apps-with-js",
  Kodama: "kodama-vst",
  "Image Tessellation": "image-tessellation",
  "Text-Masked Video": "css-mask-video-with-text",
};

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

function getCanonicalProjectReadmeLoaders() {
  return Object.entries(CANONICAL_PROJECT_READMES).reduce<Record<string, () => Promise<string>>>(
    (loaders, [modulePath, loader]) => {
      const workspaceRelativePath = modulePath.replace(/^\.\.\/\.\.\//, "");
      loaders[workspaceRelativePath] = loader as () => Promise<string>;
      return loaders;
    },
    {},
  );
}

function getProjectReadmeLoader(filePath: string): (() => Promise<string>) | null {
  const workspaceRelativePath = toWorkspaceRelativeReadmePath(filePath);
  return getCanonicalProjectReadmeLoaders()[workspaceRelativePath] ?? null;
}

function getProjectLearnMoreLink(project: HomepageProject) {
  return project.links.find((link) => link.type === "learn-more") ?? null;
}

function getMappedProjectFolder(project: HomepageProject): string {
  return EXPLICIT_PROJECT_FOLDER_OVERRIDES[project.title] ?? project.slug;
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

export function buildFallbackProjectDetailPage(project: HomepageProject): ProjectDetailPage {
  return {
    title: project.title,
    summary: project.summary,
    primaryLink: project.primaryLink,
    media: project.media,
    imageUrls: project.imageUrls,
    contentMarkdown: buildFallbackContentMarkdown(project),
    source: "homepage-fallback",
  };
}

export async function resolveProjectReadmePath(
  project: HomepageProject,
  options: ProjectReadmeResolverOptions = {},
): Promise<string | null> {
  const workspaceRoot = options.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT;
  const fileExists = options.fileExists ?? getDefaultFileExists;
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

  const mappedReadmePath = toWorkspaceAbsoluteReadmePath(
    `prototypes/${getMappedProjectFolder(project)}/${CANONICAL_README_BASENAME}`,
    workspaceRoot,
  );

  return (await fileExists(mappedReadmePath)) ? mappedReadmePath : null;
}

export function buildProjectDetailPage(
  project: HomepageProject,
  projectReadme: string | null | undefined,
  readmePath = `${DEFAULT_WORKSPACE_ROOT}/README.md`,
): ProjectDetailPage {
  const content = normalizeLineEndings(projectReadme ?? "").trim();

  if (!content.startsWith("# ")) {
    return buildFallbackProjectDetailPage(project);
  }

  const lines = content.split("\n");
  const detailBody = lines.slice(1).join("\n").trim();
  const normalizedMedia = normalizeReadmeMedia(detailBody, readmePath);

  return {
    title: project.title,
    summary: project.summary,
    primaryLink: project.primaryLink,
    media: normalizedMedia.media.length > 0 ? normalizedMedia.media : project.media,
    imageUrls: normalizedMedia.imageUrls.length > 0 ? normalizedMedia.imageUrls : project.imageUrls,
    contentMarkdown: normalizedMedia.contentMarkdown || buildFallbackContentMarkdown(project),
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

  try {
    const readme = await readProjectReadme(readmePath);
    return buildProjectDetailPage(project, readme, readmePath);
  } catch {
    return buildFallbackProjectDetailPage(project);
  }
}
