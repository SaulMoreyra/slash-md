import { resolveRepoPath, sameMarkdownTarget } from "@slash-md/core/paths";
import type { SitePage } from "./types";

export function resolveInternalHref(fromFile: string, href: string, pages: SitePage[]): string | undefined {
  const resolved = resolveRepoPath(fromFile, href);
  if (!resolved) {
    return undefined;
  }
  const hit = pages.find((page) => sameMarkdownTarget(page.path, resolved) || page.path === resolved);
  return hit?.route;
}
