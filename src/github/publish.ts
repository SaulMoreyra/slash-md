import {
  GithubApiError,
  GithubPull,
  GithubReview,
  MergeMethod,
  deleteBranch,
  getPull,
  listPullReviews,
  mergePull,
} from "./api";
import { ContentConfig } from "./config";

export class PublishBlocked extends Error {
  constructor(readonly reasons: string[]) {
    super(reasons.join(" · "));
    this.name = "PublishBlocked";
  }
}

export type PublishResult = {
  pr: GithubPull;
  publishedUrl: string;
  label: string;
};

export async function publishPull(opts: {
  token: string;
  config: ContentConfig;
  prNumber: number;
  markdown: string;
  lastReviewedHash?: string;
  remotePath?: string;
  force?: boolean;
}): Promise<PublishResult> {
  const { token, config, prNumber, remotePath, force } = opts;

  let pr = await waitForMergeability(token, config, prNumber);
  if (pr.merged || pr.merged_at) {
    return published(pr, config, remotePath);
  }
  if (pr.state !== "open") {
    throw new PublishBlocked(["PR is not open"]);
  }

  if (!force) {
    const reviews = await listPullReviews(token, config, pr.number);
    const reasons = publishBlockers(pr, reviews);
    if (reasons.length > 0) {
      throw new PublishBlocked(reasons);
    }
  }

  await mergeWithFallback(token, config, pr);

  try {
    await deleteBranch(token, config, pr.head.ref);
  } catch {
    // Merge already succeeded.
  }
  pr = await getPull(token, config, pr.number);
  return published(pr, config, remotePath);
}

export function publishBlockers(pr: GithubPull, reviews: GithubReview[]): string[] {
  const reasons: string[] = [];
  const state = (pr.mergeable_state ?? "").toLowerCase();

  if (pr.mergeable === false || state === "dirty") {
    reasons.push("conflict");
  }
  if (!isApproved(pr, reviews)) {
    reasons.push("needs approval");
  }
  return reasons;
}

function isApproved(pr: GithubPull, reviews: GithubReview[]): boolean {
  const author = pr.user?.login;
  const latestByUser = new Map<string, string>();
  for (const review of reviews) {
    const login = review.user?.login;
    if (!login || login === author || review.state === "PENDING" || review.state === "COMMENTED") {
      continue;
    }
    latestByUser.set(login, review.state);
  }
  const states = [...latestByUser.values()];
  if (states.includes("CHANGES_REQUESTED")) {
    return false;
  }
  return states.includes("APPROVED");
}

async function mergeWithFallback(token: string, config: ContentConfig, pr: GithubPull): Promise<void> {
  const methods: MergeMethod[] = ["squash", "merge", "rebase"];
  let last: unknown;
  for (const merge_method of methods) {
    try {
      await mergePull(token, config, pr.number, { sha: pr.head.sha, merge_method });
      return;
    } catch (err) {
      last = err;
      if (err instanceof GithubApiError && /merge method|not allowed|is not allowed/i.test(err.message)) {
        continue;
      }
      throw mapMergeFailure(err);
    }
  }
  throw mapMergeFailure(last);
}

async function waitForMergeability(
  token: string,
  config: ContentConfig,
  prNumber: number,
): Promise<GithubPull> {
  let pr = await getPull(token, config, prNumber);
  for (let attempt = 0; attempt < 4 && (pr.mergeable === null || pr.mergeable_state === "unknown"); attempt += 1) {
    await sleep(700);
    pr = await getPull(token, config, prNumber);
  }
  return pr;
}

function published(pr: GithubPull, config: ContentConfig, remotePath?: string): PublishResult {
  const path = remotePath ?? "";
  const publishedUrl = path
    ? `https://github.com/${config.owner}/${config.name}/blob/${config.defaultBranch}/${path}`
    : pr.html_url;
  return { pr, publishedUrl, label: "published" };
}

function mapMergeFailure(err: unknown): Error {
  if (!(err instanceof GithubApiError)) {
    return err instanceof Error ? err : new Error(String(err));
  }
  const reasons = reasonsFromMergeMessage(err.message);
  if (reasons.length > 0) {
    return new PublishBlocked(reasons);
  }
  return new PublishBlocked(["push rejected by branch protection"]);
}

function reasonsFromMergeMessage(message: string): string[] {
  const text = message.toLowerCase();
  const reasons: string[] = [];
  if (/conflict|not mergeable/.test(text)) {
    reasons.push("conflict");
  }
  if (/approv|review/.test(text)) {
    reasons.push("needs approval");
  }
  if (/status check|required status|checks? (are|is) |expected status|ci |workflow/.test(text)) {
    reasons.push("checks failing");
  }
  if (/protected branch|not authorized|permission|blocked/.test(text) && reasons.length === 0) {
    reasons.push("push rejected by branch protection");
  }
  return reasons;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
