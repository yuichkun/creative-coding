export type PortfolioLinkType = "demo" | "learn-more" | "video" | "marketplace";

export interface PortfolioLink {
  label: string;
  normalizedLabel: string;
  type?: PortfolioLinkType;
  url: string;
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

export interface HomepageProject {
  section: PortfolioHeadingRef;
  subsection?: PortfolioHeadingRef;
  slug: string;
  routeId: string;
  title: string;
  summary: string;
  primaryLink: PortfolioLink | null;
  links: PortfolioLink[];
  media: PortfolioMedia[];
  imageUrls: string[];
}

export interface HomepageSubsection extends PortfolioHeadingRef {
  projects: HomepageProject[];
}

export interface HomepageSection extends PortfolioHeadingRef {
  projects: HomepageProject[];
  subsections: HomepageSubsection[];
}

export interface PortfolioHomepage {
  sections: HomepageSection[];
  projects: HomepageProject[];
}

export interface ProjectDetailPage {
  title: string;
  summary: string;
  primaryLink: PortfolioLink | null;
  media: PortfolioMedia[];
  imageUrls: string[];
  contentMarkdown: string;
  source: "project-readme" | "homepage-fallback";
}

export interface ProjectReadmeResolverOptions {
  workspaceRoot?: string;
  fileExists?: (filePath: string) => Promise<boolean>;
  readFile?: (filePath: string) => Promise<string>;
}

export interface ReadmeMediaNormalizationOptions {
  resolveAssetUrl?: (workspaceRelativeAssetPath: string) => string | null;
}
