import { wikiSyncStatusFromPull } from "@slash-md/core/conflictModel";
import {
  GithubApiError,
  type CheckRun,
  type CombinedStatus,
  type GithubPull,
  type GithubReview,
  type MergeMethod,
  deleteBranch,
  getCombinedStatus,
  getPull,
  listCheckRuns,
  listPullReviews,
  mergePull,
} from "./api";

export { wikiSyncStatusFromPull };

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

export async function mergeOpenPull(opts: {
  token: string;
  repo: { owner: string; name: string; defaultBranch: string };
  prNumber: number;
  remotePath?: string;
}): Promise<PublishResult> {
  return finishPublish({ ...opts, skipBlockers: false });
}

async function finishPublish(opts: {
  token: string;
  repo: { owner: string; name: string; defaultBranch: string };
  prNumber: number;
  remotePath?: string;
  skipBlockers: boolean;
}): Promise<PublishResult> {
  const { token, repo, prNumber, remotePath } = opts;

  let pr = await waitForMergeability(token, repo, prNumber);
  if (pr.merged || pr.merged_at) {
    return published(pr, repo, remotePath);
  }
  if (pr.state !== "open") {
    throw new PublishBlocked(["PR is not open"]);
  }

  if (!opts.skipBlockers) {
    const reasons = await loadMergeBlockers(token, repo, pr);
    if (reasons.length > 0) {
      throw new PublishBlocked(reasons);
    }
  }

  await mergeWithFallback(token, repo, pr);

  try {
    await deleteBranch(token, repo, pr.head.ref);
  } catch {
    // Merge already succeeded.
  }
  pr = await getPull(token, repo, pr.number);
  return published(pr, repo, remotePath);
}

export async function loadMergeBlockers(
  token: string,
  repo: { owner: string; name: string },
  pr: GithubPull,
): Promise<string[]> {
  const reviews = await listPullReviews(token, repo, pr.number);
  let combined: CombinedStatus | undefined;
  let checkRuns: CheckRun[] | undefined;
  try {
    combined = await getCombinedStatus(token, repo, pr.head.sha);
  } catch {
    // Status endpoint is optional.
  }
  try {
    checkRuns = await listCheckRuns(token, repo, pr.head.sha);
  } catch {
    // Checks endpoint is optional.
  }
  return collectMergeBlockers(pr, reviews, {
    combinedState: combined?.state,
    checkRuns,
  });
}

export function collectMergeBlockers(
  pr: GithubPull,
  reviews: GithubReview[],
  extra?: {
    combinedState?: CombinedStatus["state"];
    checkRuns?: CheckRun[];
  },
): string[] {
  const reasons = publishBlockers(pr, reviews);
  const state = (pr.mergeable_state ?? "").toLowerCase();
  const checksFail =
    extra?.combinedState === "failure" ||
    extra?.combinedState === "error" ||
    (extra?.checkRuns ?? []).some(isFailedCheck);

  if (checksFail) {
    reasons.push("checks failing");
  } else if (state === "blocked" && !reasons.includes("needs approval") && !reasons.includes("conflict")) {
    reasons.push("checks failing");
  }

  return uniqueReasons(reasons);
}

function publishBlockers(pr: GithubPull, reviews: GithubReview[]): string[] {
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

function isFailedCheck(run: Pick<CheckRun, "status" | "conclusion">): boolean {
  if (run.status !== "completed") {
    return false;
  }
  const conclusion = (run.conclusion ?? "").toLowerCase();
  return (
    conclusion === "failure" ||
    conclusion === "timed_out" ||
    conclusion === "cancelled" ||
    conclusion === "action_required" ||
    conclusion === "startup_failure"
  );
}

function uniqueReasons(reasons: string[]): string[] {
  const out: string[] = [];
  for (const reason of reasons) {
    if (!out.includes(reason)) {
      out.push(reason);
    }
  }
  return out;
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

async function mergeWithFallback(
  token: string,
  repo: { owner: string; name: string },
  pr: GithubPull,
): Promise<void> {
  const methods: MergeMethod[] = ["squash", "merge", "rebase"];
  let last: unknown;
  for (const merge_method of methods) {
    try {
      await mergePull(token, repo, pr.number, { sha: pr.head.sha, merge_method });
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
  repo: { owner: string; name: string },
  prNumber: number,
): Promise<GithubPull> {
  let pr = await getPull(token, repo, prNumber);
  for (let attempt = 0; attempt < 4 && (pr.mergeable === null || pr.mergeable_state === "unknown"); attempt += 1) {
    await sleep(700);
    pr = await getPull(token, repo, prNumber);
  }
  return pr;
}

function published(
  pr: GithubPull,
  repo: { owner: string; name: string; defaultBranch: string },
  remotePath?: string,
): PublishResult {
  const path = remotePath ?? "";
  const publishedUrl = path
    ? `https://github.com/${repo.owner}/${repo.name}/blob/${repo.defaultBranch}/${path}`
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
