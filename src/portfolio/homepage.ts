import type {
  HomepageGroup,
  HomepageProject,
  HomepageSection,
  HomepageSubsection,
  PortfolioHomepage,
  PortfolioHeadingRef,
  PortfolioLink,
  PortfolioLinkType,
} from "./types";
import { normalizeReadmeMedia } from "./media";
import {
  type HeadingNode,
  createUniqueSlug,
  getProjectDetailPath,
  getHeadingNodes,
  isLeafHeadingNode,
  normalizeLineEndings,
} from "./routes";

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const SINGLE_LINE_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/;
const ROOT_README_PATH = "/workspace/README.md";

export function trimParagraphs(value: string): string[] {
  return normalizeLineEndings(value)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizePortfolioLinkLabel(label: string): string {
  return label
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPortfolioLinkType(label: string): PortfolioLinkType | undefined {
  switch (normalizePortfolioLinkLabel(label).toLowerCase()) {
    case "demo":
      return "demo";
    case "learn more":
      return "learn-more";
    case "video":
      return "video";
    case "vs code marketplace":
      return "marketplace";
    default:
      return undefined;
  }
}

export function normalizePortfolioLink(label: string, url: string): PortfolioLink {
  const normalizedLabel = normalizePortfolioLinkLabel(label);
  const type = getPortfolioLinkType(label);

  return {
    label,
    normalizedLabel,
    ...(type ? { type } : {}),
    url,
  };
}

export function extractImageUrls(value: string): string[] {
  return normalizeReadmeMedia(value, ROOT_README_PATH).imageUrls;
}

function isImageOnlyLine(line: string): boolean {
  const trimmed = line.trim();

  return trimmed.startsWith("![") || trimmed.startsWith("<img");
}

function extractPrimaryLinks(block: string): PortfolioLink[] {
  const lines = normalizeLineEndings(block).split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || isImageOnlyLine(trimmed)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(MARKDOWN_LINK_PATTERN), ([, label, url]) =>
      normalizePortfolioLink(label, url),
    );

    if (matches.length > 0) {
      return matches;
    }
  }

  return [];
}

function extractSummary(block: string): string {
  const lines = normalizeLineEndings(block).split("\n");
  const firstLinkLineIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return !isImageOnlyLine(trimmed) && SINGLE_LINE_LINK_PATTERN.test(trimmed);
  });
  const relevantLines = firstLinkLineIndex >= 0 ? lines.slice(firstLinkLineIndex + 1) : lines;

  return trimParagraphs(relevantLines.join("\n"))[0] ?? "";
}

function createProject(
  node: HeadingNode,
  section: PortfolioHeadingRef,
  groupPath: PortfolioHeadingRef[],
  projectSlugCounts: Map<string, number>,
): HomepageProject {
  const links = extractPrimaryLinks(node.body);
  const slug = createUniqueSlug(node.title, projectSlugCounts);
  const normalizedMedia = normalizeReadmeMedia(node.body, ROOT_README_PATH);

  return {
    section: { title: section.title, slug: section.slug },
    ...(groupPath[0]
      ? {
          subsection: {
            title: groupPath[0].title,
            slug: groupPath[0].slug,
          },
        }
      : {}),
    groupPath: groupPath.map((group) => ({ title: group.title, slug: group.slug })),
    slug,
    routeId: slug,
    detailPath: getProjectDetailPath(slug),
    title: node.title,
    summary: extractSummary(node.body),
    primaryLink: links[0] ?? null,
    links,
    actionLinks: links,
    media: normalizedMedia.media,
    imageUrls: normalizedMedia.imageUrls,
    resolvedReadmePath: null,
  };
}

function createGroup(
  node: HeadingNode,
  section: PortfolioHeadingRef,
  parentPath: PortfolioHeadingRef[],
  groupSlugCounts: Map<string, number>,
  projectSlugCounts: Map<string, number>,
): HomepageGroup {
  const groupRef = {
    title: node.title,
    slug: createUniqueSlug(node.title, groupSlugCounts),
  };
  const groupPath = [...parentPath, groupRef];
  const group: HomepageGroup = {
    ...groupRef,
    projects: [],
    groups: [],
  };

  node.children.forEach((child) => {
    if (isLeafHeadingNode(child)) {
      group.projects.push(createProject(child, section, groupPath, projectSlugCounts));
      return;
    }

    const childGroup = createGroup(child, section, groupPath, groupSlugCounts, projectSlugCounts);

    group.groups.push(childGroup);
    group.projects.push(...childGroup.projects);
  });

  return group;
}

function createSubsection(group: HomepageGroup): HomepageSubsection {
  return {
    title: group.title,
    slug: group.slug,
    projects: group.projects,
    groups: group.groups,
  };
}

export function parsePortfolioHomepageModel(readme: string): PortfolioHomepage {
  const normalizedReadme = normalizeLineEndings(readme).trim();
  const sectionNodes = getHeadingNodes(readme);
  const sections: HomepageSection[] = [];
  const projects: HomepageProject[] = [];
  const sectionSlugCounts = new Map<string, number>();
  const groupSlugCounts = new Map<string, number>();
  const projectSlugCounts = new Map<string, number>();

  sectionNodes.forEach((sectionNode) => {
    const sectionRef = {
      title: sectionNode.title,
      slug: createUniqueSlug(sectionNode.title, sectionSlugCounts),
    };
    const section: HomepageSection = {
      ...sectionRef,
      projects: [],
      subsections: [],
      groups: [],
    };

    sectionNode.children.forEach((child) => {
      if (isLeafHeadingNode(child)) {
        const project = createProject(child, sectionRef, [], projectSlugCounts);

        section.projects.push(project);
        projects.push(project);
        return;
      }

      const group = createGroup(child, sectionRef, [], groupSlugCounts, projectSlugCounts);

      section.groups.push(group);
      section.subsections.push(createSubsection(group));
      projects.push(...group.projects);
    });

    sections.push(section);
  });

  return {
    documentTitle: normalizedReadme.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Portfolio",
    documentMarkdown: normalizedReadme,
    documentHtml: "",
    sections,
    projects,
  };
}
