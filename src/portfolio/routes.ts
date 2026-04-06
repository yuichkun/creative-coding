export interface PortfolioProjectRoute {
  title: string;
  routeId: string;
  path: string;
}

export interface HeadingNode {
  level: number;
  title: string;
  body: string;
  children: HeadingNode[];
}

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/gm;
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

function getFlatHeadingNodes(readme: string): HeadingNode[] {
  const content = getContentAfterToc(readme);
  const matches = Array.from(content.matchAll(HEADING_PATTERN));

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const level = match[1].length;
    const title = (match[2] ?? "").trim();
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = nextMatch?.index ?? content.length;

    return {
      level,
      title,
      body: content.slice(bodyStart, bodyEnd).trim(),
      children: [],
    };
  });
}

export function getHeadingNodes(readme: string): HeadingNode[] {
  const nodes = getFlatHeadingNodes(readme);
  const roots: HeadingNode[] = [];
  const stack: HeadingNode[] = [];

  nodes.forEach((node) => {
    while (stack.length > 0 && stack[stack.length - 1]!.level >= node.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  });

  return roots;
}

export function isLeafHeadingNode(node: HeadingNode): boolean {
  return node.children.length === 0;
}

export function collectLeafHeadingNodes(nodes: HeadingNode[]): HeadingNode[] {
  return nodes.flatMap((node) =>
    isLeafHeadingNode(node) ? [node] : collectLeafHeadingNodes(node.children),
  );
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
  const sectionNodes = getHeadingNodes(readme);
  const projectSlugCounts = new Map<string, number>();
  const routes: PortfolioProjectRoute[] = [];

  sectionNodes
    .flatMap((node) => collectLeafHeadingNodes(node.children))
    .forEach((node) => {
      const routeId = createUniqueSlug(node.title, projectSlugCounts);

      routes.push({
        title: node.title,
        routeId,
        path: getProjectDetailPath(routeId),
      });
    });

  return routes;
}
