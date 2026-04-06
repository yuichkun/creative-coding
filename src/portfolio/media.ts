import type {
  PortfolioMedia,
  PortfolioMediaSyntax,
  ReadmeMediaNormalizationOptions,
} from "./types";

const WORKSPACE_ROOT = "/workspace";
const LINKED_MARKDOWN_IMAGE_PATTERN = /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g;
const STANDALONE_MARKDOWN_IMAGE_PATTERN = /(?<!\[)!\[([^\]]*)\]\(([^)]+)\)/g;
const HTML_IMAGE_PATTERN = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g;
const HTML_IMAGE_SRC_PATTERN = /(\bsrc=["'])([^"']+)(["'])/;
const HTML_IMAGE_ALT_PATTERN = /\balt=["']([^"']*)["']/i;
const LOCAL_ASSET_MODULES = import.meta.glob(
  [
    "../../assets/**/*.{apng,avif,gif,jpeg,jpg,png,svg,webp}",
    "../../prototypes/**/*.{apng,avif,gif,jpeg,jpg,png,svg,webp}",
  ],
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

interface Replacement {
  start: number;
  end: number;
  value: string;
}

interface NormalizedImageNode {
  media: PortfolioMedia | null;
  replacement: string;
}

export interface NormalizedReadmeMedia {
  contentMarkdown: string;
  media: PortfolioMedia[];
  imageUrls: string[];
}

const LOCAL_ASSET_URLS = Object.entries(LOCAL_ASSET_MODULES).reduce<Record<string, string>>(
  (urls, [modulePath, assetUrl]) => {
    urls[modulePath.replace(/^\.\.\/\.\.\//, "")] = assetUrl;
    return urls;
  },
  {},
);

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function isExternalUrl(url: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith("//");
}

function toWorkspaceRelativePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(new RegExp(`^${WORKSPACE_ROOT}/`), "")
    .replace(/^\//, "");
}

function normalizePathSegments(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/");
  const resolved: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      resolved.pop();
      continue;
    }

    resolved.push(segment);
  }

  return resolved.join("/");
}

function getDirectoryName(filePath: string): string {
  const normalized = normalizePathSegments(toWorkspaceRelativePath(filePath));
  const segments = normalized.split("/");

  segments.pop();

  return segments.join("/");
}

function resolveReadmeRelativeAssetPath(readmePath: string, assetUrl: string): string {
  const directory = getDirectoryName(readmePath);
  const cleanedUrl = assetUrl.replace(/\\/g, "/").replace(/^\//, "");

  return normalizePathSegments(directory ? `${directory}/${cleanedUrl}` : cleanedUrl);
}

function getDefaultAssetUrl(workspaceRelativeAssetPath: string): string | null {
  return LOCAL_ASSET_URLS[workspaceRelativeAssetPath] ?? null;
}

function normalizeImageUrl(
  originalUrl: string,
  readmePath: string,
  options: ReadmeMediaNormalizationOptions,
): string | null {
  if (isExternalUrl(originalUrl)) {
    return originalUrl;
  }

  const resolveAssetUrl = options.resolveAssetUrl ?? getDefaultAssetUrl;
  const workspaceRelativeAssetPath = resolveReadmeRelativeAssetPath(readmePath, originalUrl);

  return resolveAssetUrl(workspaceRelativeAssetPath);
}

function createMedia(
  syntax: PortfolioMediaSyntax,
  alt: string,
  originalUrl: string,
  url: string,
  linkUrl?: string,
): PortfolioMedia {
  return {
    kind: "image",
    syntax,
    alt,
    originalUrl,
    url,
    ...(linkUrl ? { linkUrl } : {}),
  };
}

function normalizeLinkedMarkdownImage(
  alt: string,
  imageUrl: string,
  linkUrl: string,
  readmePath: string,
  options: ReadmeMediaNormalizationOptions,
): NormalizedImageNode {
  const normalizedUrl = normalizeImageUrl(imageUrl, readmePath, options);

  if (!normalizedUrl) {
    return {
      media: null,
      replacement: alt ? `[${alt}](${linkUrl})` : linkUrl,
    };
  }

  return {
    media: createMedia("markdown", alt, imageUrl, normalizedUrl, linkUrl),
    replacement: `[![${alt}](${normalizedUrl})](${linkUrl})`,
  };
}

function normalizeStandaloneMarkdownImage(
  alt: string,
  imageUrl: string,
  readmePath: string,
  options: ReadmeMediaNormalizationOptions,
): NormalizedImageNode {
  const normalizedUrl = normalizeImageUrl(imageUrl, readmePath, options);

  if (!normalizedUrl) {
    return { media: null, replacement: "" };
  }

  return {
    media: createMedia("markdown", alt, imageUrl, normalizedUrl),
    replacement: `![${alt}](${normalizedUrl})`,
  };
}

function normalizeHtmlImage(
  html: string,
  imageUrl: string,
  readmePath: string,
  options: ReadmeMediaNormalizationOptions,
): NormalizedImageNode {
  const normalizedUrl = normalizeImageUrl(imageUrl, readmePath, options);
  const alt = HTML_IMAGE_ALT_PATTERN.exec(html)?.[1] ?? "";

  if (!normalizedUrl) {
    return { media: null, replacement: "" };
  }

  return {
    media: createMedia("html", alt, imageUrl, normalizedUrl),
    replacement: html.replace(HTML_IMAGE_SRC_PATTERN, `$1${normalizedUrl}$3`),
  };
}

function applyReplacements(content: string, replacements: Replacement[]): string {
  if (replacements.length === 0) {
    return content;
  }

  const orderedReplacements = [...replacements].sort((left, right) => left.start - right.start);
  let cursor = 0;
  let result = "";

  for (const replacement of orderedReplacements) {
    result += content.slice(cursor, replacement.start);
    result += replacement.value;
    cursor = replacement.end;
  }

  result += content.slice(cursor);

  return result;
}

export function normalizeReadmeMedia(
  contentMarkdown: string,
  readmePath: string,
  options: ReadmeMediaNormalizationOptions = {},
): NormalizedReadmeMedia {
  const normalizedContent = normalizeLineEndings(contentMarkdown);
  const replacements: Replacement[] = [];
  const media: PortfolioMedia[] = [];

  for (const match of normalizedContent.matchAll(LINKED_MARKDOWN_IMAGE_PATTERN)) {
    const [raw, alt = "", imageUrl = "", linkUrl = ""] = match;
    const { media: item, replacement } = normalizeLinkedMarkdownImage(
      alt,
      imageUrl,
      linkUrl,
      readmePath,
      options,
    );

    if (item) {
      media.push(item);
    }

    replacements.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + raw.length,
      value: replacement,
    });
  }

  for (const match of normalizedContent.matchAll(STANDALONE_MARKDOWN_IMAGE_PATTERN)) {
    const [raw, alt = "", imageUrl = ""] = match;
    const { media: item, replacement } = normalizeStandaloneMarkdownImage(
      alt,
      imageUrl,
      readmePath,
      options,
    );

    if (item) {
      media.push(item);
    }

    replacements.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + raw.length,
      value: replacement,
    });
  }

  for (const match of normalizedContent.matchAll(HTML_IMAGE_PATTERN)) {
    const [raw, imageUrl = ""] = match;
    const { media: item, replacement } = normalizeHtmlImage(raw, imageUrl, readmePath, options);

    if (item) {
      media.push(item);
    }

    replacements.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + raw.length,
      value: replacement,
    });
  }

  const rewrittenContent = applyReplacements(normalizedContent, replacements)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    contentMarkdown: rewrittenContent,
    media,
    imageUrls: media.map((item) => item.url),
  };
}
