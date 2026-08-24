export function posixNormalize(value: string): string {
  const parts = value.replace(/\\/g, "/").split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      if (out.length === 0 || out[out.length - 1] === "..") {
        out.push("..");
      } else {
        out.pop();
      }
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

/**
 * Canonical contentPath for config files: `"."` = repo root, else a relative folder.
 * Accepts `""`, `"."`, `"./"`, `"/docs/"`, etc.
 */
export function normalizeContentPathInput(value: string): string {
  const trimmed = value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!trimmed || trimmed === ".") {
    return ".";
  }
  return trimmed;
}

/**
 * Runtime prefix for joins / guards. `"."` / empty → `""` (repo root).
 */
export function contentPathPrefix(contentPath: string): string {
  const trimmed = contentPath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!trimmed || trimmed === ".") {
    return "";
  }
  return trimmed;
}

export function isUnderContentPath(repoPath: string, contentPath: string): boolean {
  const normalized = posixNormalize(repoPath);
  const root = contentPathPrefix(contentPath);
  if (!root) {
    return Boolean(normalized);
  }
  return normalized === root || normalized.startsWith(`${root}/`);
}

export function posixDirname(value: string): string {
  const normalized = posixNormalize(value);
  const idx = normalized.lastIndexOf("/");
  return idx <= 0 ? "" : normalized.slice(0, idx);
}

export function posixBasename(value: string): string {
  const normalized = posixNormalize(value);
  const idx = normalized.lastIndexOf("/");
  return idx < 0 ? normalized : normalized.slice(idx + 1);
}

export function posixJoin(...parts: string[]): string {
  return posixNormalize(parts.filter(Boolean).join("/"));
}

export function posixRelative(fromDir: string, toPath: string): string {
  const from = posixNormalize(fromDir).split("/").filter(Boolean);
  const to = posixNormalize(toPath).split("/").filter(Boolean);
  let i = 0;
  while (i < from.length && i < to.length && from[i] === to[i]) {
    i += 1;
  }
  const ups = from.slice(i).map(() => "..");
  const rest = to.slice(i);
  return [...ups, ...rest].join("/") || ".";
}

export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

export function hrefPath(href: string): string {
  return href.split("#")[0]?.split("?")[0] ?? "";
}

export function resolveRepoPath(fromFile: string, href: string): string | undefined {
  const pathOnly = hrefPath(href);
  if (!pathOnly || isExternalHref(pathOnly) || pathOnly.startsWith("/")) {
    return undefined;
  }
  const resolved = posixNormalize(posixJoin(posixDirname(fromFile), pathOnly));
  if (!resolved || resolved.startsWith("../") || resolved === "..") {
    return undefined;
  }
  return resolved;
}

export function relativeHref(fromFile: string, toFile: string): string {
  const rel = posixRelative(posixDirname(fromFile), toFile);
  return rel.startsWith(".") ? rel : rel;
}

export function imageRepoPath(contentPath: string, filename: string): string {
  return posixJoin(contentPath, "images", filename);
}

export function imageMarkdownSrc(docPath: string, contentPath: string, filename: string): string {
  return relativeHref(docPath, imageRepoPath(contentPath, filename));
}

export function sameMarkdownTarget(a: string, b: string): boolean {
  const left = stripMd(posixNormalize(a));
  const right = stripMd(posixNormalize(b));
  return left === right;
}

function stripMd(path: string): string {
  return path.replace(/\.md$/i, "");
}
