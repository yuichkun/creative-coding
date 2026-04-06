import type {
  HomepageProject,
  HomepageSection,
  HomepageSubsection,
  PortfolioHomepage,
  PortfolioLink,
  PortfolioLinkType,
} from "./types";
import { normalizeReadmeMedia } from "./media";
import {
  createUniqueSlug,
  getHeadingNodes,
  isSubsectionNode,
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
  title: string,
  body: string,
  section: HomepageSection,
  subsection: HomepageSubsection | undefined,
  projectSlugCounts: Map<string, number>,
): HomepageProject {
  const links = extractPrimaryLinks(body);
  const slug = createUniqueSlug(title, projectSlugCounts);
  const normalizedMedia = normalizeReadmeMedia(body, ROOT_README_PATH);

  return {
    section: { title: section.title, slug: section.slug },
    ...(subsection ? { subsection: { title: subsection.title, slug: subsection.slug } } : {}),
    slug,
    routeId: slug,
    title,
    summary: extractSummary(body),
    primaryLink: links[0] ?? null,
    links,
    media: normalizedMedia.media,
    imageUrls: normalizedMedia.imageUrls,
  };
}

export function parsePortfolioHomepageModel(readme: string): PortfolioHomepage {
  const nodes = getHeadingNodes(readme);
  const sections: HomepageSection[] = [];
  const projects: HomepageProject[] = [];
  const sectionSlugCounts = new Map<string, number>();
  const subsectionSlugCounts = new Map<string, number>();
  const projectSlugCounts = new Map<string, number>();

  let currentSection: HomepageSection | undefined;
  let currentSubsection: HomepageSubsection | undefined;

  nodes.forEach((node, index) => {
    const nextNode = nodes[index + 1];

    if (node.level === 2) {
      currentSection = {
        title: node.title,
        slug: createUniqueSlug(node.title, sectionSlugCounts),
        projects: [],
        subsections: [],
      };
      sections.push(currentSection);
      currentSubsection = undefined;
      return;
    }

    if (!currentSection) {
      return;
    }

    if (node.level === 3 && isSubsectionNode(node, nextNode)) {
      currentSubsection = {
        title: node.title,
        slug: createUniqueSlug(node.title, subsectionSlugCounts),
        projects: [],
      };
      currentSection.subsections.push(currentSubsection);
      return;
    }

    if (node.level === 3) {
      currentSubsection = undefined;
    }

    const project = createProject(
      node.title,
      node.body,
      currentSection,
      currentSubsection,
      projectSlugCounts,
    );
    projects.push(project);

    if (currentSubsection && node.level === 4) {
      currentSubsection.projects.push(project);
      return;
    }

    currentSection.projects.push(project);
  });

  return { sections, projects };
}
