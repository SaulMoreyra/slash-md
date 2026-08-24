import { setFrontmatterField, splitFrontmatter } from "../domain/frontmatter";
import { posixNormalize } from "../domain/paths";
import { isInboxMarkdownPath } from "./inboxModel";
import { parsePrNumber } from "../editor/threadGate";

export type ReviewPage = {
  path: string;
  title: string;
  pr?: number;
  status: string;
  reviewBranch?: string;
};

export type ResolvePublishPr =
  | { kind: "none" }
  | { kind: "one"; pr: number }
  | { kind: "many"; prs: number[] };

export function parseReviewPage(path: string, markdown: string, title: string): ReviewPage {
  const fields = splitFrontmatter(markdown).fields;
  return {
    path: posixNormalize(path),
    title,
    pr: parsePrNumber(fields.pr),
    status: fields.status.trim().toLowerCase(),
    reviewBranch: fields.reviewBranch.trim() || undefined,
  };
}

export function resolvePublishPr(opts: {
  selectedWithPr: number[];
  scannedPrs: number[];
}): ResolvePublishPr {
  const selected = uniqueNumbers(opts.selectedWithPr);
  if (selected.length === 1) {
    return { kind: "one", pr: selected[0] };
  }
  if (selected.length > 1) {
    return { kind: "many", prs: selected };
  }
  const scanned = uniqueNumbers(opts.scannedPrs);
  if (scanned.length === 1) {
    return { kind: "one", pr: scanned[0] };
  }
  if (scanned.length > 1) {
    return { kind: "many", prs: scanned };
  }
  return { kind: "none" };
}

export function loteMarkdownPaths(
  contentPath: string,
  yamlPaths: string[],
  prFilenames: string[],
): string[] {
  const out = new Set<string>();
  for (const raw of [...yamlPaths, ...prFilenames]) {
    const path = posixNormalize(raw);
    if (isInboxMarkdownPath(path, contentPath)) {
      out.add(path);
    }
  }
  return [...out].sort();
}

/** Drop lote PR fields. Call after `stampDocMeta(..., { status: "published" })`. */
export function dropReviewFields(markdown: string): string {
  let next = setFrontmatterField(markdown, "pr", "");
  next = setFrontmatterField(next, "reviewBranch", "");
  return next;
}

/** Local stamp only: published + drop PR fields. Never commit/push. */
export function stampPublishedLocal(markdown: string): string {
  return dropReviewFields(setFrontmatterField(markdown, "status", "published"));
}

function uniqueNumbers(values: number[]): number[] {
  const out: number[] = [];
  for (const value of values) {
    if (!out.includes(value)) {
      out.push(value);
    }
  }
  return out.sort((a, b) => a - b);
}
