import rehypeMermaid from "rehype-mermaid";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { findInternalReadmeRoute, resolveLocalLinkTarget } from "./links";
import { normalizeReadmeAssetUrl, toWorkspaceRelativePath } from "./media";
import { slugifyHeading } from "./routes";
import type { InternalReadmeRoute } from "./types";

export interface ProjectMarkdownRenderOptions {
  readmePath: string;
  internalReadmeRoutes?: InternalReadmeRoute[];
  explicitLinkRewrites?: Record<string, string>;
}

function getNodeText(node: any): string {
  if (!node) {
    return "";
  }

  if (node.type === "text") {
    return typeof node.value === "string" ? node.value : "";
  }

  if (Array.isArray(node.children)) {
    return node.children.map((child: unknown) => getNodeText(child)).join("");
  }

  return "";
}

function rehypeApplyHeadingIds() {
  return function transform(tree: unknown) {
    const slugCounts = new Map<string, number>();

    visit(tree, "element", (node: any) => {
      if (
        typeof node.tagName !== "string" ||
        !/^h[1-6]$/.test(node.tagName) ||
        typeof node.properties?.id === "string"
      ) {
        return;
      }

      const headingText = getNodeText(node).trim();

      if (!headingText) {
        return;
      }

      const baseSlug = slugifyHeading(headingText);

      if (!baseSlug) {
        return;
      }

      const count = slugCounts.get(baseSlug) ?? 0;
      slugCounts.set(baseSlug, count + 1);
      node.properties = {
        ...node.properties,
        id: count === 0 ? baseSlug : `${baseSlug}-${count + 1}`,
      };
    });
  };
}

function rehypeRewritePortfolioUrls(options: ProjectMarkdownRenderOptions) {
  return function transform(tree: unknown) {
    visit(tree, "element", (node: any) => {
      if (node.tagName === "img" && typeof node.properties?.src === "string") {
        const normalizedAssetUrl = normalizeReadmeAssetUrl(node.properties.src, options.readmePath, {});

        if (normalizedAssetUrl) {
          node.properties.src = normalizedAssetUrl;
        }
      }

      if (node.tagName !== "a" || typeof node.properties?.href !== "string") {
        return;
      }

      const explicitRewrite = options.explicitLinkRewrites?.[node.properties.href];

      if (explicitRewrite) {
        node.properties.href = explicitRewrite;
        node.properties["data-portfolio-link-kind"] = "internal-detail";
        return;
      }

      const localTarget = resolveLocalLinkTarget(node.properties.href, options.readmePath);

      if (!localTarget) {
        return;
      }

      const internalRoute = findInternalReadmeRoute(
        localTarget.workspacePath,
        options.internalReadmeRoutes ?? [],
      );

      if (internalRoute) {
        node.properties.href = `${internalRoute.detailPath}${localTarget.hash}`;
        node.properties["data-portfolio-link-kind"] = "internal-detail";
        node.properties["data-portfolio-route-id"] = internalRoute.routeId;
        return;
      }

      node.properties.href = `/${toWorkspaceRelativePath(localTarget.workspacePath)}${localTarget.hash}`;
      node.properties["data-portfolio-link-kind"] = "local-doc";
    });
  };
}

export async function renderProjectMarkdown(
  contentMarkdown: string,
  options: ProjectMarkdownRenderOptions,
): Promise<string> {
  const content = contentMarkdown.trim();

  if (content.length === 0) {
    return "";
  }

  return String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeApplyHeadingIds)
      .use(rehypeRewritePortfolioUrls, options)
      .use(rehypeMermaid, { strategy: "inline-svg" })
      .use(rehypeStringify)
      .process(content),
  );
}
