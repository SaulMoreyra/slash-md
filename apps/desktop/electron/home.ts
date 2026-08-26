import { wikiSyncStatusFromPull } from "@slash-md/github/merge";
import { getCombinedStatus, getPull, listCheckRuns, listPullReviews, type GithubPull, type GithubReview } from "@slash-md/github/api";
import { loadInboxRest } from "@slash-md/github/comments";
import { isWorkspaceMode } from "@slash-md/core/configTypes";
import type { HomeTreePayload, InReviewPage, LoteReviewSummary } from "@slash-md/core/homeTypes";
import { contentPathPrefix, posixJoin, posixNormalize } from "@slash-md/core/paths";
import { templateDirCandidates } from "@slash-md/core/templates";
import { configuredSections, dirExists, getContentConfig, readSlashmd, readText, repoFile } from "./config";
import { currentAuth, resolveToken } from "./auth";
import { currentBranchName, isGitWorkspace, isMergeInProgress } from "./git";
import { getWorkspaceRoot, readStaging, writeStaging } from "./session";
import { buildLevel, listInReviewPages, listLocalDrafts, listLocalMarkdown, listPendingReviewMarkdown, titleFor } from "./workspace";
import { getPublicationState, listPublications } from "./publication";

export async function buildHomeTree(): Promise<HomeTreePayload> {
  const root = getWorkspaceRoot();
  const config = await getContentConfig(root);
  if (!root || !config) {
    return {
      repo: "",
      contentPath: ".",
      needsAuth: false,
      needsInit: true,
      fromWorkspace: false,
      roots: [],
      drafts: [],
      selected: [],
      inbox: [],
      canPublishBatch: false,
      canSendReview: false,
    };
  }

  const slashmd = await readSlashmd(root);
  const files = await listLocalMarkdown(root, config.contentPath);
  const configured = [
    ...new Set([
      ...configuredSections(slashmd, config.contentPath),
      ...(await existingTemplateSections(root, config.contentPath, slashmd.templatesPath)),
    ]),
  ];
  const roots = await buildLevel(config.contentPath, files, configured, (filePath) => titleFor(root, filePath));

  const workspaceMode = isWorkspaceMode(config.mode);
  const { publication, canWrite } = workspaceMode
    ? await getPublicationState()
    : { publication: null, canWrite: true };

  const branch = (await isGitWorkspace(root)) ? await currentBranchName(root) : undefined;

  const publications = workspaceMode
    ? await listPublications()
    : undefined;

  const drafts = publication
    ? await listLocalDrafts(root, config.contentPath, files, { requireGitChanges: true })
    : workspaceMode
      ? []
      : await listLocalDrafts(root, config.contentPath, files);

  const pendingReview = publication
    ? await listPendingReviewMarkdown(root, config.contentPath, config.defaultBranch, publication.branch)
    : [];
  const canSendReview = pendingReview.length > 0;

  const live = new Set(drafts.map((draft) => draft.path));
  const selected = readStaging(root).filter((item) => live.has(item));
  if (selected.length !== readStaging(root).length) {
    writeStaging(root, selected);
  }

  const token = await resolveToken();
  const auth = await currentAuth();
  const inbox =
    workspaceMode && token
      ? await loadInboxRest({
          token,
          repo: config,
          contentPath: config.contentPath,
          viewerHint: auth?.login,
          fileText: async (filePath) => readText(repoFile(root, filePath)),
        })
      : { items: [] };

  const inReview = await listInReviewPages(root, config.contentPath, files, publication);

  const canPublishBatch = publication?.kind === "in_review" && Boolean(publication.prNumber);

  const loteReview = publication?.prNumber
    ? await loadLoteReviewFromPublication(token, config, publication)
    : await loadLoteReviewSummary(token, config, inReview);

  const indexCandidates = [posixJoin(config.contentPath, "README.md"), posixJoin(config.contentPath, "index.md")];
  const indexPath = files.find((item) => indexCandidates.includes(item));
  const merging = (await isGitWorkspace(root)) ? await isMergeInProgress(root) : false;
  const wikiSyncStatus = merging ? "merging" : loteReview?.wikiSyncStatus ?? "idle";

  return {
    repo: config.repo,
    contentPath: config.contentPath,
    needsAuth: !token,
    needsInit: false,
    fromWorkspace: true,
    roots,
    drafts,
    selected,
    inbox: inbox.items,
    inboxError: inbox.error,
    canPublishBatch,
    canSendReview,
    indexPath,
    loteReview,
    publication,
    canWrite,
    publications,
    branch,
    wikiSyncStatus,
  };
}

async function loadLoteReviewSummary(
  token: string | undefined,
  config: { owner: string; name: string },
  inReviewPages: InReviewPage[],
): Promise<LoteReviewSummary | undefined> {
  if (!token || inReviewPages.length === 0) {
    return undefined;
  }
  const prNumber = inReviewPages.map((page) => page.pr).find(Boolean);
  if (!prNumber) {
    return undefined;
  }
  return loadLoteReviewByPr(token, config, prNumber);
}

async function loadLoteReviewFromPublication(
  token: string | undefined,
  config: { owner: string; name: string },
  publication: { prNumber?: number },
): Promise<LoteReviewSummary | undefined> {
  if (!token || !publication.prNumber) {
    return undefined;
  }
  return loadLoteReviewByPr(token, config, publication.prNumber);
}

async function loadLoteReviewByPr(
  token: string,
  config: { owner: string; name: string },
  prNumber: number,
): Promise<LoteReviewSummary | undefined> {
  try {
    const pr = await getPull(token, config, prNumber);
    const reviews = await listPullReviews(token, config, prNumber);
    const checksOk = await loadChecksOk(token, config, pr);
    const approvals = countApprovals(pr, reviews);
    const reviewers = [
      ...(pr.requested_reviewers ?? []).map((user) => user.login),
      ...(pr.requested_teams ?? []).map((team) => team.slug),
    ];
    const state: LoteReviewSummary["state"] =
      pr.merged || pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : "open";
    return {
      prNumber: pr.number,
      prUrl: pr.html_url,
      title: pr.title,
      branch: pr.head.ref,
      reviewers,
      checksOk,
      approvals,
      state,
      wikiSyncStatus: wikiSyncStatusFromPull(pr),
    };
  } catch {
    return undefined;
  }
}

async function loadChecksOk(
  token: string,
  config: { owner: string; name: string },
  pr: GithubPull,
): Promise<boolean | null> {
  try {
    const [combined, runs] = await Promise.all([
      getCombinedStatus(token, config, pr.head.sha),
      listCheckRuns(token, config, pr.head.sha),
    ]);
    if (combined.state === "pending" || runs.some((run) => run.status !== "completed")) {
      return null;
    }
    if (combined.state === "failure" || combined.state === "error") {
      return false;
    }
    const hasFailed = runs.some(
      (run) =>
        run.status === "completed" &&
        run.conclusion !== "success" &&
        run.conclusion !== "skipped" &&
        run.conclusion !== "neutral",
    );
    return !hasFailed;
  } catch {
    return null;
  }
}

async function existingTemplateSections(
  root: string,
  contentPath: string,
  configuredPath?: string,
): Promise<string[]> {
  const prefix = contentPathPrefix(contentPath);
  const out: string[] = [];
  for (const dir of templateDirCandidates(contentPath, configuredPath)) {
    const norm = posixNormalize(dir);
    if (!norm) {
      continue;
    }
    if (prefix && norm !== prefix && !norm.startsWith(`${prefix}/`)) {
      continue;
    }
    if (await dirExists(repoFile(root, dir))) {
      out.push(norm);
    }
  }
  return out;
}

function countApprovals(pr: GithubPull, reviews: GithubReview[]): number {
  const author = pr.user?.login;
  const latestByUser = new Map<string, string>();
  for (const review of reviews) {
    const login = review.user?.login;
    if (!login || login === author || review.state === "PENDING" || review.state === "COMMENTED") {
      continue;
    }
    latestByUser.set(login, review.state);
  }
  let count = 0;
  for (const state of latestByUser.values()) {
    if (state === "APPROVED") {
      count += 1;
    }
  }
  return count;
}
