export interface PortfolioProjectRoute {
  title: string;
  routeId: string;
  path: string;
}

export interface HeadingNode {
  level: 2 | 3 | 4;
  title: string;
  body: string;
}

const HEADING_PATTERN = /^(#{2,4})\s+(.+)$/gm;
const DETAIL_ROUTE_BASE = "/projects";

export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

export function slugifyHeading(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[']/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getContentAfterToc(readme: string): string {
  const normalized = normalizeLineEndings(readme);
  const tocStopIndex = normalized.indexOf("<!-- tocstop -->");

  return tocStopIndex >= 0
    ? normalized.slice(tocStopIndex + "<!-- tocstop -->".length)
    : normalized;
}

export function getHeadingNodes(readme: string): HeadingNode[] {
  const content = getContentAfterToc(readme);
  const matches = Array.from(content.matchAll(HEADING_PATTERN));

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const level = match[1].length as 2 | 3 | 4;
    const title = (match[2] ?? "").trim();
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = nextMatch?.index ?? content.length;

    return {
      level,
      title,
      body: content.slice(bodyStart, bodyEnd).trim(),
    };
  });
}

export function isSubsectionNode(node: HeadingNode, nextNode: HeadingNode | undefined): boolean {
  return node.level === 3 && node.body.length === 0 && nextNode?.level === 4;
}

export function createUniqueSlug(title: string, counts: Map<string, number>): string {
  const baseSlug = slugifyHeading(title);
  const count = counts.get(baseSlug) ?? 0;

  counts.set(baseSlug, count + 1);

  return count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
}

export function getProjectDetailPath(routeId: string): string {
  return `${DETAIL_ROUTE_BASE}/${routeId}/`;
}

export function collectPortfolioProjectRoutes(readme: string): PortfolioProjectRoute[] {
  const nodes = getHeadingNodes(readme);
  const projectSlugCounts = new Map<string, number>();
  const routes: PortfolioProjectRoute[] = [];

  let hasCurrentSection = false;

  nodes.forEach((node, index) => {
    const nextNode = nodes[index + 1];

    if (node.level === 2) {
      hasCurrentSection = true;
      return;
    }

    if (!hasCurrentSection) {
      return;
    }

    if (node.level === 3 && isSubsectionNode(node, nextNode)) {
      return;
    }

    const routeId = createUniqueSlug(node.title, projectSlugCounts);

    routes.push({
      title: node.title,
      routeId,
      path: getProjectDetailPath(routeId),
    });
  });

  return routes;
}
