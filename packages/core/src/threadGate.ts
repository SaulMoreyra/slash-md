import { splitFrontmatter } from "./frontmatter";

export type ReviewThreadTarget = {
  prNumber: number;
  remotePath: string;
};

/** YAML `pr: 42` or a draft-meta integer. */
export function parsePrNumber(value: string | number | undefined | null): number | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }
  const n = Number.parseInt(trimmed, 10);
  return n > 0 ? n : undefined;
}

/**
 * Threads load when the page is `in_review` with a PR, or a sidecar still has an open PR.
 * `published` or missing `pr` → no threads.
 */
export function reviewThreadTarget(opts: {
  markdown: string;
  draftPr?: number;
  fileRemotePath?: string;
  draftRemotePath?: string;
}): ReviewThreadTarget | undefined {
  const fields = splitFrontmatter(opts.markdown).fields;
  const status = fields.status.trim().toLowerCase();
  if (status === "published") {
    return undefined;
  }
  const prNumber = parsePrNumber(fields.pr) ?? opts.draftPr;
  if (!prNumber) {
    return undefined;
  }
  if (status !== "in_review" && !opts.draftPr) {
    return undefined;
  }
  const remotePath = opts.fileRemotePath?.trim() || opts.draftRemotePath?.trim();
  if (!remotePath) {
    return undefined;
  }
  return { prNumber, remotePath };
}
