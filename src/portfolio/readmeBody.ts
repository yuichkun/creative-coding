import { normalizeLineEndings } from "./routes";

export type ReadmeInlineNode =
  | { type: "text"; value: string }
  | { type: "link"; url: string; children: ReadmeInlineNode[] }
  | { type: "strong"; children: ReadmeInlineNode[] }
  | { type: "emphasis"; children: ReadmeInlineNode[] }
  | { type: "code"; value: string };

export type ReadmeBodyBlock =
  | { type: "paragraph"; content: ReadmeInlineNode[] }
  | { type: "heading"; level: 2 | 3 | 4 | 5 | 6; content: ReadmeInlineNode[] }
  | { type: "list"; ordered: boolean; items: ReadmeInlineNode[][] }
  | {
      type: "image";
      src: string;
      alt: string;
      syntax: "markdown" | "html";
      align: "start" | "center";
      linkUrl?: string;
    }
  | { type: "code"; language: string | null; value: string }
  | { type: "thematic-break" };

const HEADING_PATTERN = /^(#{2,6})\s+(.+)$/;
const THEMATIC_BREAK_PATTERN = /^---+$/;
const ORDERED_LIST_ITEM_PATTERN = /^\d+\.\s+(.+)$/;
const UNORDERED_LIST_ITEM_PATTERN = /^[-*]\s+(.+)$/;
const FENCED_CODE_PATTERN = /^```([^`]*)$/;
const LINKED_MARKDOWN_IMAGE_PATTERN = /^\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)$/;
const MARKDOWN_IMAGE_PATTERN = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const HTML_IMG_TAG_PATTERN = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i;
const HTML_IMAGE_ALT_PATTERN = /\balt=["']([^"']*)["']/i;
const CENTERED_PARAGRAPH_PATTERN = /^<p\b[^>]*\balign=["']center["'][^>]*>/i;
const MARKDOWN_LINK_PATTERN = /^\[([^\]]+)\]\(([^)]+)\)/;
const AUTOLINK_PATTERN = /^<((?:[a-z][a-z\d+.-]*:)?\/\/[^>\s]+)>/i;

function createTextNode(value: string): ReadmeInlineNode | null {
  return value.length > 0 ? { type: "text", value } : null;
}

function parseDelimitedInline(
  value: string,
  delimiter: "**" | "*" | "`",
  type: "strong" | "emphasis" | "code",
  depth: number,
): { node: ReadmeInlineNode; length: number } | null {
  if (!value.startsWith(delimiter)) {
    return null;
  }

  const closingIndex = value.indexOf(delimiter, delimiter.length);

  if (closingIndex <= delimiter.length) {
    return null;
  }

  const innerValue = value.slice(delimiter.length, closingIndex);

  if (type === "code") {
    return {
      node: { type: "code", value: innerValue },
      length: closingIndex + delimiter.length,
    };
  }

  return {
    node: {
      type,
      children: parseReadmeInline(innerValue, depth + 1),
    },
    length: closingIndex + delimiter.length,
  };
}

function parseInlineLink(
  value: string,
  depth: number,
): { node: ReadmeInlineNode; length: number } | null {
  const match = value.match(MARKDOWN_LINK_PATTERN);

  if (!match) {
    return null;
  }

  return {
    node: {
      type: "link",
      url: match[2],
      children: parseReadmeInline(match[1], depth + 1),
    },
    length: match[0].length,
  };
}

function parseAutolink(value: string): { node: ReadmeInlineNode; length: number } | null {
  const match = value.match(AUTOLINK_PATTERN);

  if (!match) {
    return null;
  }

  return {
    node: {
      type: "link",
      url: match[1],
      children: [{ type: "text", value: match[1] }],
    },
    length: match[0].length,
  };
}

function flushTextNode(buffer: string, nodes: ReadmeInlineNode[]) {
  const textNode = createTextNode(buffer);

  if (textNode) {
    nodes.push(textNode);
  }
}

export function parseReadmeInline(value: string, depth = 0): ReadmeInlineNode[] {
  if (!value) {
    return [];
  }

  if (depth > 6) {
    return [{ type: "text", value }];
  }

  const nodes: ReadmeInlineNode[] = [];
  let buffer = "";
  let cursor = 0;

  while (cursor < value.length) {
    const slice = value.slice(cursor);
    const parsedNode =
      parseDelimitedInline(slice, "**", "strong", depth) ??
      parseDelimitedInline(slice, "*", "emphasis", depth) ??
      parseDelimitedInline(slice, "`", "code", depth) ??
      parseInlineLink(slice, depth) ??
      parseAutolink(slice);

    if (!parsedNode) {
      buffer += value[cursor];
      cursor += 1;
      continue;
    }

    flushTextNode(buffer, nodes);
    buffer = "";
    nodes.push(parsedNode.node);
    cursor += parsedNode.length;
  }

  flushTextNode(buffer, nodes);

  return nodes;
}

function joinParagraphLines(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .join(" ")
    .trim();
}

function isMarkdownImageLine(line: string): boolean {
  return LINKED_MARKDOWN_IMAGE_PATTERN.test(line) || MARKDOWN_IMAGE_PATTERN.test(line);
}

function isHtmlImageStart(line: string): boolean {
  return line.startsWith("<img") || line.startsWith("<p");
}

function isHtmlCommentStart(line: string): boolean {
  return line.startsWith("<!--");
}

function parseMarkdownImage(line: string): ReadmeBodyBlock | null {
  const linkedMatch = line.match(LINKED_MARKDOWN_IMAGE_PATTERN);

  if (linkedMatch) {
    return {
      type: "image",
      src: linkedMatch[2],
      alt: linkedMatch[1],
      syntax: "markdown",
      align: "start",
      linkUrl: linkedMatch[3],
    };
  }

  const imageMatch = line.match(MARKDOWN_IMAGE_PATTERN);

  if (!imageMatch) {
    return null;
  }

  return {
    type: "image",
    src: imageMatch[2],
    alt: imageMatch[1],
    syntax: "markdown",
    align: "start",
  };
}

function parseHtmlImage(block: string): ReadmeBodyBlock | null {
  const trimmedBlock = block.trim();

  if (trimmedBlock === "<p></p>") {
    return null;
  }

  const imageMatch = trimmedBlock.match(HTML_IMG_TAG_PATTERN);

  if (!imageMatch) {
    return null;
  }

  const alt = trimmedBlock.match(HTML_IMAGE_ALT_PATTERN)?.[1] ?? "";

  return {
    type: "image",
    src: imageMatch[1],
    alt,
    syntax: "html",
    align: CENTERED_PARAGRAPH_PATTERN.test(trimmedBlock) ? "center" : "start",
  };
}

function isListItem(line: string): boolean {
  return ORDERED_LIST_ITEM_PATTERN.test(line) || UNORDERED_LIST_ITEM_PATTERN.test(line);
}

function isBlockBoundary(lines: string[], index: number): boolean {
  const trimmed = lines[index]?.trim() ?? "";

  return (
    trimmed.length === 0 ||
    isHtmlCommentStart(trimmed) ||
    FENCED_CODE_PATTERN.test(trimmed) ||
    HEADING_PATTERN.test(trimmed) ||
    THEMATIC_BREAK_PATTERN.test(trimmed) ||
    isListItem(trimmed) ||
    isMarkdownImageLine(trimmed) ||
    isHtmlImageStart(trimmed)
  );
}

function consumeHtmlComment(lines: string[], startIndex: number): number {
  let index = startIndex;

  while (index < lines.length) {
    if (lines[index]?.includes("-->")) {
      return index + 1;
    }

    index += 1;
  }

  return index;
}

function consumeCodeBlock(
  lines: string[],
  startIndex: number,
): { block: ReadmeBodyBlock; nextIndex: number } {
  const openingLine = lines[startIndex]?.trim() ?? "";
  const language = openingLine.match(FENCED_CODE_PATTERN)?.[1]?.trim() || null;
  const contentLines: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length) {
    if (FENCED_CODE_PATTERN.test(lines[index]?.trim() ?? "")) {
      return {
        block: {
          type: "code",
          language,
          value: contentLines.join("\n"),
        },
        nextIndex: index + 1,
      };
    }

    contentLines.push(lines[index] ?? "");
    index += 1;
  }

  return {
    block: {
      type: "code",
      language,
      value: contentLines.join("\n"),
    },
    nextIndex: index,
  };
}

function consumeHtmlImage(
  lines: string[],
  startIndex: number,
): { block: ReadmeBodyBlock | null; nextIndex: number } | null {
  const openingLine = lines[startIndex]?.trim() ?? "";

  if (!isHtmlImageStart(openingLine)) {
    return null;
  }

  if (openingLine.startsWith("<img")) {
    return {
      block: parseHtmlImage(openingLine),
      nextIndex: startIndex + 1,
    };
  }

  const blockLines = [lines[startIndex] ?? ""];
  let index = startIndex + 1;

  while (index < lines.length) {
    blockLines.push(lines[index] ?? "");

    if ((lines[index] ?? "").includes("</p>")) {
      const block = parseHtmlImage(blockLines.join("\n"));

      return {
        block:
          block ??
          ({
            type: "paragraph",
            content: parseReadmeInline(joinParagraphLines(blockLines)),
          } satisfies ReadmeBodyBlock),
        nextIndex: index + 1,
      };
    }

    index += 1;
  }

  return {
    block: {
      type: "paragraph",
      content: parseReadmeInline(joinParagraphLines(blockLines)),
    },
    nextIndex: index,
  };
}

function consumeList(
  lines: string[],
  startIndex: number,
): { block: ReadmeBodyBlock; nextIndex: number } | null {
  const firstLine = lines[startIndex]?.trim() ?? "";
  const ordered = ORDERED_LIST_ITEM_PATTERN.test(firstLine);
  const itemPattern = ordered ? ORDERED_LIST_ITEM_PATTERN : UNORDERED_LIST_ITEM_PATTERN;
  const items: ReadmeInlineNode[][] = [];
  let index = startIndex;

  while (index < lines.length) {
    const trimmed = lines[index]?.trim() ?? "";
    const itemMatch = trimmed.match(itemPattern);

    if (!itemMatch) {
      break;
    }

    items.push(parseReadmeInline(itemMatch[1]));
    index += 1;
  }

  if (items.length === 0) {
    return null;
  }

  return {
    block: {
      type: "list",
      ordered,
      items,
    },
    nextIndex: index,
  };
}

function consumeParagraph(
  lines: string[],
  startIndex: number,
): { block: Extract<ReadmeBodyBlock, { type: "paragraph" }>; nextIndex: number } {
  const paragraphLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && !isBlockBoundary(lines, index)) {
    paragraphLines.push(lines[index] ?? "");
    index += 1;
  }

  return {
    block: {
      type: "paragraph",
      content: parseReadmeInline(joinParagraphLines(paragraphLines)),
    },
    nextIndex: index,
  };
}

export function parseReadmeBody(contentMarkdown: string): ReadmeBodyBlock[] {
  const lines = normalizeLineEndings(contentMarkdown).split("\n");
  const blocks: ReadmeBodyBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index]?.trim() ?? "";

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isHtmlCommentStart(trimmed)) {
      index = consumeHtmlComment(lines, index);
      continue;
    }

    if (FENCED_CODE_PATTERN.test(trimmed)) {
      const result = consumeCodeBlock(lines, index);
      blocks.push(result.block);
      index = result.nextIndex;
      continue;
    }

    const headingMatch = trimmed.match(HEADING_PATTERN);

    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 2 | 3 | 4 | 5 | 6,
        content: parseReadmeInline(headingMatch[2].trim()),
      });
      index += 1;
      continue;
    }

    if (THEMATIC_BREAK_PATTERN.test(trimmed)) {
      blocks.push({ type: "thematic-break" });
      index += 1;
      continue;
    }

    if (isMarkdownImageLine(trimmed)) {
      const imageBlock = parseMarkdownImage(trimmed);

      if (imageBlock) {
        blocks.push(imageBlock);
      }

      index += 1;
      continue;
    }

    const htmlImage = consumeHtmlImage(lines, index);

    if (htmlImage) {
      if (htmlImage.block) {
        blocks.push(htmlImage.block);
      }

      index = htmlImage.nextIndex;
      continue;
    }

    const list = consumeList(lines, index);

    if (list) {
      blocks.push(list.block);
      index = list.nextIndex;
      continue;
    }

    const paragraph = consumeParagraph(lines, index);

    if (paragraph.block.content.length > 0) {
      blocks.push(paragraph.block);
    }

    index = paragraph.nextIndex;
  }

  return blocks;
}
