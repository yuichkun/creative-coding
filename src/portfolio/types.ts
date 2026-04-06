export type PortfolioLinkType = "demo" | "learn-more" | "video" | "marketplace";

export type PortfolioLinkDestinationKind = "external" | "internal-detail" | "local-doc";

export interface PortfolioLink {
  label: string;
  normalizedLabel: string;
  type?: PortfolioLinkType;
  url: string;
  href?: string;
  sourceUrl?: string;
  destinationKind?: PortfolioLinkDestinationKind;
  routeId?: string;
  workspacePath?: string;
}

export type PortfolioMediaKind = "image";

export type PortfolioMediaSyntax = "markdown" | "html";

export interface PortfolioMedia {
  kind: PortfolioMediaKind;
  syntax: PortfolioMediaSyntax;
  alt: string;
  originalUrl: string;
  url: string;
  linkUrl?: string;
}

export interface PortfolioHeadingRef {
  title: string;
  slug: string;
}

export interface HomepageGroup extends PortfolioHeadingRef {
  projects: HomepageProject[];
  groups: HomepageGroup[];
}

export interface HomepageProject {
  section: PortfolioHeadingRef;
  subsection?: PortfolioHeadingRef;
  groupPath: PortfolioHeadingRef[];
  slug: string;
  routeId: string;
  detailPath: string;
  title: string;
  summary: string;
  primaryLink: PortfolioLink | null;
  links: PortfolioLink[];
  actionLinks: PortfolioLink[];
  media: PortfolioMedia[];
  imageUrls: string[];
  resolvedReadmePath: string | null;
}

export interface HomepageSubsection extends PortfolioHeadingRef {
  projects: HomepageProject[];
  groups: HomepageGroup[];
}

export interface HomepageSection extends PortfolioHeadingRef {
  projects: HomepageProject[];
  subsections: HomepageSubsection[];
  groups: HomepageGroup[];
}

export interface PortfolioHomepage {
  documentTitle: string;
  documentMarkdown: string;
  documentHtml: string;
  sections: HomepageSection[];
  projects: HomepageProject[];
}

export interface ProjectDetailPage {
  detailPath: string;
  title: string;
  summary: string;
  primaryLink: PortfolioLink | null;
  links: PortfolioLink[];
  actionLinks: PortfolioLink[];
  media: PortfolioMedia[];
  imageUrls: string[];
  contentMarkdown: string;
  contentHtml: string;
  resolvedReadmePath: string | null;
  source: "project-readme" | "homepage-fallback";
}

export interface InternalReadmeRoute {
  readmePath: string;
  routeId: string;
  detailPath: string;
  title: string;
}

export interface LocalProjectReadmeManifestEntry {
  folder: string;
  folderSlug: string;
  readmePath: string;
  title: string | null;
  titleSlug: string | null;
}

export interface ProjectReadmeResolverOptions {
  workspaceRoot?: string;
  fileExists?: (filePath: string) => Promise<boolean>;
  readFile?: (filePath: string) => Promise<string>;
  localReadmes?: LocalProjectReadmeManifestEntry[];
  internalReadmeRoutes?: InternalReadmeRoute[];
  resolvedReadmePath?: string | null;
}

export interface ReadmeMediaNormalizationOptions {
  resolveAssetUrl?: (workspaceRelativeAssetPath: string) => string | null;
}
