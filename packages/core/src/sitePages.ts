import { contentPathPrefix, isUnderContentPath, posixBasename, posixJoin, posixNormalize } from "./paths";
import { isTemplateRepoPath, templateDirCandidates } from "./templates";

/** Wiki `.md` under `contentPath`, excluding sidecar `*.slash.md`. */
export function isContentMarkdown(filePath: string, contentPath: string): boolean {
  if (!filePath.endsWith(".md") || filePath.endsWith(".slash.md")) {
    return false;
  }
  return isUnderContentPath(filePath, contentPath);
}

/** Pages the reader/site may publish (not templates, not sidecars). */
export function shouldPublishPage(filePath: string, contentPath: string, templatesPath?: string): boolean {
  if (!isContentMarkdown(filePath, contentPath)) {
    return false;
  }
  return !isTemplateRepoPath(filePath, templateDirCandidates(contentPath, templatesPath));
}

/**
 * Site URL prefix. Empty → `""`. `"/"` stays. `"Help"` → `"/Help/"`.
 */
export function normalizeBasePath(value: string | undefined): string {
  if (value === undefined) {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "/") {
    return "/";
  }
  const inner = trimmed.replace(/^\/+|\/+$/g, "");
  if (!inner) {
    return "/";
  }
  return `/${inner}/`;
}

/** Join `basePath` with a site-relative path (`assets/reader.js` → `/Help/assets/reader.js`). */
export function joinSitePath(basePath: string, rel: string): string {
  const path = rel.replace(/^\/+/, "");
  const base = normalizeBasePath(basePath) || "/";
  if (base === "/") {
    return `/${path}`;
  }
  return `${base}${path}`;
}

/**
 * Pretty route from the site root (`/foo/`). Does not include `basePath`.
 * Folder `README.md` maps to the folder URL unless a sibling `folder.md` is in `publishedPaths`.
 */
export function routeFor(
  repoPath: string,
  contentPath: string,
  publishedPaths: readonly string[] = [],
): string {
  const rel = stripContentPrefix(repoPath, contentPath);
  if (!rel) {
    return "/";
  }
  const published = new Set(publishedPaths.map((item) => posixNormalize(item)));
  const prefix = contentPathPrefix(contentPath);
  const parts = rel.split("/").filter(Boolean);
  const file = parts.at(-1) ?? "";
  const dirParts = parts.slice(0, -1);

  if (isReadmeFilename(file)) {
    if (dirParts.length === 0) {
      return "/";
    }
    const sibling = posixJoin(prefix, `${dirParts.join("/")}.md`);
    if (published.has(posixNormalize(sibling))) {
      return `/${[...dirParts, readmeStem(file)].join("/")}/`;
    }
    return `/${dirParts.join("/")}/`;
  }

  const stem = file.replace(/\.md$/i, "");
  return `/${[...dirParts, stem].filter(Boolean).join("/")}/`;
}

export function stripContentPrefix(repoPath: string, contentPath: string): string {
  const target = posixNormalize(repoPath);
  const prefix = contentPathPrefix(contentPath);
  if (!prefix) {
    return target;
  }
  if (target === prefix) {
    return "";
  }
  if (target.startsWith(`${prefix}/`)) {
    return target.slice(prefix.length + 1);
  }
  return target;
}

function isReadmeFilename(name: string): boolean {
  return posixBasename(name).toLowerCase() === "readme.md";
}

function readmeStem(filename: string): string {
  return filename.replace(/\.md$/i, "").toLowerCase();
}
