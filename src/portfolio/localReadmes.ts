import { slugifyHeading } from "./routes";
import type { LocalProjectReadmeManifestEntry } from "./types";

const CANONICAL_PROJECT_READMES = import.meta.glob("../../prototypes/*/README.md", {
  query: "?raw",
  import: "default",
});
const CANONICAL_PROJECT_README_CONTENT = import.meta.glob("../../prototypes/*/README.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function toWorkspaceRelativePath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^\/workspace\//, "")
    .replace(/^\.\//, "")
    .replace(/^\.\.\/\.\.\//, "");
}

function extractFolderName(readmePath: string): string {
  const segments = toWorkspaceRelativePath(readmePath).split("/").filter(Boolean);
  return segments.at(-2) ?? "";
}

function extractReadmeTitle(readme: string): string | null {
  const firstHeading = readme.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return firstHeading && firstHeading.length > 0 ? firstHeading : null;
}

function buildCanonicalProjectReadmeLoaders() {
  return Object.entries(CANONICAL_PROJECT_READMES).reduce<Record<string, () => Promise<string>>>(
    (loaders, [modulePath, loader]) => {
      loaders[toWorkspaceRelativePath(modulePath)] = loader as () => Promise<string>;
      return loaders;
    },
    {},
  );
}

const CANONICAL_PROJECT_README_LOADERS = buildCanonicalProjectReadmeLoaders();

const LOCAL_PROJECT_README_MANIFEST: LocalProjectReadmeManifestEntry[] = Object.entries(
  CANONICAL_PROJECT_README_CONTENT,
).map(([modulePath, readme]) => {
  const workspaceRelativePath = toWorkspaceRelativePath(modulePath);
  const folder = extractFolderName(workspaceRelativePath);
  const title = extractReadmeTitle(readme);

  return {
    folder,
    folderSlug: slugifyHeading(folder),
    readmePath: `/workspace/${workspaceRelativePath}`,
    title,
    titleSlug: title ? slugifyHeading(title) : null,
  };
});

export function getLocalProjectReadmeManifest(): LocalProjectReadmeManifestEntry[] {
  return LOCAL_PROJECT_README_MANIFEST;
}

export function getProjectReadmeLoader(filePath: string): (() => Promise<string>) | null {
  return CANONICAL_PROJECT_README_LOADERS[toWorkspaceRelativePath(filePath)] ?? null;
}
