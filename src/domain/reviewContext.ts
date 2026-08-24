export type ReviewContextMismatchReason = "pr" | "branch" | "missing";

export type ReviewContextInput = {
  localPr?: number;
  inboxPr: number;
  localBranch?: string;
  reviewBranch?: string;
  /** True when the commented file is not on disk in the workspace. */
  missingFile?: boolean;
};

export type ReviewContextDecision = {
  show: boolean;
  reason?: ReviewContextMismatchReason;
};

/**
 * Whether to show the Feedback context banner (no git switch).
 * Show when PR numbers differ, HEAD ≠ review branch, or the file is missing.
 */
export function shouldShowReviewContextBanner(input: ReviewContextInput): ReviewContextDecision {
  if (input.missingFile) {
    return { show: true, reason: "missing" };
  }
  if (Number.isFinite(input.inboxPr) && input.inboxPr > 0) {
    if (input.localPr !== undefined && input.localPr > 0 && input.localPr !== input.inboxPr) {
      return { show: true, reason: "pr" };
    }
  }
  const local = normalizeBranch(input.localBranch);
  const review = normalizeBranch(input.reviewBranch);
  if (local && review && local !== review) {
    return { show: true, reason: "branch" };
  }
  return { show: false };
}

export function reviewContextBannerText(opts: {
  prNumber: number;
  localBranch?: string;
  reviewBranch?: string;
  reason?: ReviewContextMismatchReason;
}): string {
  const pr = `PR #${opts.prNumber}`;
  const review = opts.reviewBranch?.trim();
  const local = opts.localBranch?.trim();
  if (opts.reason === "missing") {
    return `Comments are on ${pr}${review ? ` (${review})` : ""}. This file is not in your local workspace. Your other local changes were not touched.`;
  }
  const reviewBit = review ? `${pr} (${review})` : pr;
  const localBit = local ? `local copy (${local})` : "local copy";
  return `Comments are on ${reviewBit}. You are viewing the ${localBit}. Your changes were not touched.`;
}

function normalizeBranch(value: string | undefined): string {
  return (value ?? "").trim().replace(/^refs\/heads\//, "");
}
