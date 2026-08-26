import { slugify } from "@slash-md/core/slug";

const PREFIX = "pub/";

export function isPublicationBranch(branch: string): boolean {
  return branch.startsWith(PREFIX);
}

export function publicationBranchName(title: string, at = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  return `${PREFIX}${date}-${slugify(title)}`;
}

export function titleFromPublicationBranch(branch: string): string {
  const raw = branch.replace(/^pub\/\d{4}-\d{2}-\d{2}-/, "");
  return raw.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function nextFreePublicationBranch(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    return base;
  }
  for (let i = 2; i <= 21; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Cannot find free publication branch for ${base}`);
}
