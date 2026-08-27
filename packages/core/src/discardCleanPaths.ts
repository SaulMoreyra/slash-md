import { isUnderContentPath, posixNormalize } from "./paths";

/**
 * Paths `git clean -fd --` may touch when discarding a publication.
 * Never returns `"."` — a root contentPath is limited to markdown and `images/`.
 */
export function discardCleanPaths(contentPath: string, files: string[]): string[] {
  const trimmed = contentPath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const atRoot = !trimmed || trimmed === ".";
  if (!atRoot) {
    return files.filter((file) => isUnderContentPath(file, contentPath));
  }
  return files.filter((file) => {
    const path = posixNormalize(file);
    return path.endsWith(".md") || path === "images" || path.startsWith("images/");
  });
}
