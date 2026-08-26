import { posixNormalize } from "./paths";

export function isReviewMarkdownPath(filePath: string): boolean {
  return filePath.endsWith(".md") && !filePath.endsWith(".slash.md");
}

/** Union of unpushed commit paths and working-tree paths, markdown only. */
export function collectPendingReviewMarkdown(diffNames: string[], porcelainNames: string[]): string[] {
  const paths = new Set<string>();
  for (const raw of [...diffNames, ...porcelainNames]) {
    const filePath = posixNormalize(raw.trim());
    if (filePath && isReviewMarkdownPath(filePath)) {
      paths.add(filePath);
    }
  }
  return [...paths].sort();
}
