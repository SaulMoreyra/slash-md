import * as vscode from "vscode";
import { stampDocMeta } from "@slash-md/core/docMeta";
import { resolveCreateWorkspaceRoot } from "../workspace/docsWorkspace";
import { listInReviewPages, readStagingSelection, writeStagingSelection } from "../workspace/localDrafts";
import { labeledTitle } from "@slash-md/core/messaging";
import { posixBasename, posixNormalize } from "@slash-md/core/paths";
import { docsWorkspaceRoot, listLocalMarkdown } from "../home/homeTree";
import { getGithubSession } from "./auth";
import { ContentConfig, getContentConfig } from "./config";
import { GithubPull, getPull, listPullFiles } from "@slash-md/github/api";
import {
  dropReviewFields,
  loteMarkdownPaths,
  parseReviewPage,
  resolvePublishPr,
  type ReviewPage,
} from "@slash-md/github/batchPublishModel";
import { GitError, runGit } from "./git";
import { invalidateInboxCache } from "./inbox";
import { PublishBlocked, loadMergeBlockers, mergeOpenPull } from "./publish";

export type BatchPublishResult = {
  pr: GithubPull;
  paths: string[];
  pulled: boolean;
};

/**
 * Merge the lote PR, fast-forward the docs workspace, stamp every lote `.md`.
 * Does not skip blockers, rewrite the index, or push the default branch.
 */
export async function publishBatch(
  context: vscode.ExtensionContext,
  opts?: { preferredPr?: number },
): Promise<BatchPublishResult | undefined> {
  const prepared = await prepareBatchPublish(context, opts);
  if (!prepared) {
    return undefined;
  }

  try {
    return await executeBatchPublish(prepared);
  } catch (err) {
    if (isPublishBlocked(err)) {
      await vscode.window.showWarningMessage(err instanceof Error ? err.message : "needs approval");
      return undefined;
    }
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showErrorMessage(`Publish failed: ${message}`);
    return undefined;
  }
}

type PreparedPublish = {
  context: vscode.ExtensionContext;
  config: ContentConfig;
  root: vscode.Uri;
  cwd: string;
  token: string;
  prNumber: number;
  pages: ReviewPage[];
};

async function prepareBatchPublish(
  context: vscode.ExtensionContext,
  opts?: { preferredPr?: number },
): Promise<PreparedPublish | undefined> {
  const config = getContentConfig();
  if (!config) {
    await vscode.window.showWarningMessage("Repo not configured. Use Init before publishing.");
    return undefined;
  }
  if (config.mode === "personal") {
    await vscode.window.showInformationMessage(
      "Aprobar y Publicar is workspace/PR-only. Personal mode publishes directly (no pull request).",
    );
    return undefined;
  }

  const root = (await docsWorkspaceRoot(config)) ?? (await resolveCreateWorkspaceRoot());
  if (!root) {
    await vscode.window.showWarningMessage("Open the docs folder to publish.");
    return undefined;
  }
  if (!(await isGitWorkspace(root.fsPath))) {
    await vscode.window.showWarningMessage(
      "The docs workspace is not a Git repository. Open the docs repo as a folder to publish.",
    );
    return undefined;
  }

  let session: vscode.AuthenticationSession;
  try {
    const next = await getGithubSession();
    if (!next) {
      await vscode.window.showWarningMessage("Sign in to GitHub to publish.");
      return undefined;
    }
    session = next;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showWarningMessage(message || "Sign in to GitHub to publish.");
    return undefined;
  }

  const files = await listLocalMarkdown(root, config.contentPath);
  const inReview = await listInReviewPages(root, config.contentPath, files);
  const selected = readStagingSelection(context).map(posixNormalize).filter(Boolean);
  const selectedPages = (await readPages(root, selected)).filter((page) => page.pr);
  const resolved = opts?.preferredPr
    ? { kind: "one" as const, pr: opts.preferredPr }
    : resolvePublishPr({
        selectedWithPr: selectedPages.map((page) => page.pr!),
        scannedPrs: inReview.map((page) => page.pr),
      });

  let prNumber: number | undefined;
  if (resolved.kind === "none") {
    await vscode.window.showWarningMessage("No in-review pull request to publish.");
    return undefined;
  }
  if (resolved.kind === "many") {
    prNumber = await pickPr(resolved.prs, [...inReview, ...selectedPages]);
    if (!prNumber) {
      return undefined;
    }
  } else {
    prNumber = resolved.pr;
  }

  const pages = uniquePages([
    ...inReview.filter((page) => page.pr === prNumber),
    ...selectedPages.filter((page) => page.pr === prNumber),
  ]);

  return {
    context,
    config,
    root,
    cwd: root.fsPath,
    token: session.accessToken,
    prNumber,
    pages,
  };
}

async function executeBatchPublish(prep: PreparedPublish): Promise<BatchPublishResult | undefined> {
  const { config, root, cwd, token, prNumber, pages } = prep;
  let pr = await getPull(token, config, prNumber);
  const alreadyMerged = Boolean(pr.merged || pr.merged_at);

  if (!alreadyMerged && pr.state !== "open") {
    await vscode.window.showWarningMessage("PR is not open");
    return undefined;
  }

  if (!alreadyMerged) {
    const listed = await listPagesForConfirm(token, config, prNumber, pages);
    if (listed.length === 0) {
      await vscode.window.showWarningMessage(`PR #${prNumber} has no documentation pages to publish.`);
      return undefined;
    }
    const titles = listed.map((page) => `• ${page.title} (${page.path})`).join("\n");
    const confirm = await vscode.window.showInformationMessage(
      `Merge PR #${prNumber} and publish these pages?\n\n${titles}`,
      { modal: true },
      "Aprobar y Publicar",
    );
    if (confirm !== "Aprobar y Publicar") {
      return undefined;
    }

    const reasons = await loadMergeBlockers(token, config, pr);
    if (reasons.length > 0) {
      await vscode.window.showWarningMessage(reasons.join(" · "));
      return undefined;
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Publishing…" },
      async () => {
        const result = await mergeOpenPull({
          token,
          config,
          prNumber,
        });
        pr = result.pr;
      },
    );
  }

  let pulled = false;
  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Updating workspace…" },
      async () => {
        await syncDefaultBranch(cwd, token, config.defaultBranch, reviewBranchOf(pr, pages));
        pulled = true;
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showWarningMessage(message);
    return undefined;
  }

  const prFiles = await listPullFilesSafe(token, config, prNumber);
  const lote = loteMarkdownPaths(
    config.contentPath,
    pages.map((page) => page.path),
    prFiles,
  );
  const stamped = await stampLote(root, lote);
  const stampedSet = new Set(stamped);
  const remaining = readStagingSelection(prep.context).filter((path) => !stampedSet.has(posixNormalize(path)));
  await writeStagingSelection(prep.context, remaining);
  invalidateInboxCache();

  await vscode.window.showInformationMessage(
    alreadyMerged
      ? `PR #${prNumber} was already merged. Marked ${stamped.length} page${stamped.length === 1 ? "" : "s"} published.`
      : `Published PR #${prNumber} (${stamped.length} page${stamped.length === 1 ? "" : "s"}).`,
  );

  return { pr, paths: stamped, pulled };
}

async function listPagesForConfirm(
  token: string,
  config: ContentConfig,
  prNumber: number,
  pages: ReviewPage[],
): Promise<{ title: string; path: string }[]> {
  if (pages.length > 0) {
    return pages.map((page) => ({ title: page.title, path: page.path }));
  }
  const files = await listPullFilesSafe(token, config, prNumber);
  return loteMarkdownPaths(config.contentPath, [], files).map((path) => ({
    title: posixBasename(path),
    path,
  }));
}

async function listPullFilesSafe(
  token: string,
  config: ContentConfig,
  prNumber: number,
): Promise<string[]> {
  try {
    const files = await listPullFiles(token, config, prNumber);
    return files.filter((file) => file.status !== "removed").map((file) => file.filename);
  } catch {
    return [];
  }
}

async function stampLote(root: vscode.Uri, paths: string[]): Promise<string[]> {
  const stamped: string[] = [];
  for (const path of paths) {
    const uri = workspaceFile(root, path);
    if (!(await fileExists(uri))) {
      continue;
    }
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    const next = dropReviewFields(stampDocMeta(text, { status: "published" }));
    if (next !== text) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(next, "utf8"));
    }
    stamped.push(path);
  }
  return stamped;
}

async function syncDefaultBranch(
  cwd: string,
  token: string,
  defaultBranch: string,
  reviewBranch: string | undefined,
): Promise<void> {
  try {
    await runGit(["fetch", "origin", defaultBranch], { cwd, token });
  } catch {
    // Pull below still talks to origin.
  }

  const current = (await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd })).trim();
  if (current !== defaultBranch) {
    try {
      await switchNoForce(cwd, defaultBranch);
    } catch (err) {
      throw switchFailed(err, defaultBranch, current, reviewBranch);
    }
  }

  try {
    await runGit(["pull", "--ff-only", "origin", defaultBranch], { cwd, token });
  } catch (err) {
    const detail = gitDetail(err);
    throw new Error(detail || `git pull --ff-only origin ${defaultBranch} failed.`);
  }
}

async function switchNoForce(cwd: string, branch: string): Promise<void> {
  const current = (await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd })).trim();
  if (current === branch) {
    return;
  }
  if (await refExists(cwd, `refs/heads/${branch}`)) {
    await runGit(["switch", branch], { cwd });
    return;
  }
  if (await refExists(cwd, `refs/remotes/origin/${branch}`)) {
    await runGit(["switch", "--track", `origin/${branch}`], { cwd });
    return;
  }
  throw new Error(`Branch ${branch} was not found locally or on origin.`);
}

function switchFailed(err: unknown, branch: string, current: string, reviewBranch?: string): Error {
  const detail = gitDetail(err);
  const from = reviewBranch && current === reviewBranch ? `review branch ${current}` : current;
  return new Error(
    `PR merged, but could not switch from ${from} to ${branch} without overwriting local work. Switch and pull manually. ${detail}`.trim(),
  );
}

function gitDetail(err: unknown): string {
  if (err instanceof GitError) {
    return err.stderr || err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

function reviewBranchOf(pr: GithubPull, pages: ReviewPage[]): string | undefined {
  return pages.find((page) => page.reviewBranch)?.reviewBranch || pr.head.ref || undefined;
}

async function pickPr(prs: number[], pages: ReviewPage[]): Promise<number | undefined> {
  const picked = await vscode.window.showQuickPick(
    prs.map((pr) => {
      const titles = pages.filter((page) => page.pr === pr).map((page) => page.title);
      return {
        label: `PR #${pr}`,
        description: titles.length > 0 ? titles.join(", ") : undefined,
        pr,
      };
    }),
    {
      title: "Choose a review PR to publish",
      placeHolder: "Multiple in-review PRs found",
      ignoreFocusOut: true,
    },
  );
  return picked?.pr;
}

async function readPages(root: vscode.Uri, paths: string[]): Promise<ReviewPage[]> {
  const out: ReviewPage[] = [];
  for (const path of paths) {
    try {
      const uri = workspaceFile(root, path);
      const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
      out.push(parseReviewPage(path, text, labeledTitle(text, posixBasename(path))));
    } catch {
      // Missing selection entries are ignored.
    }
  }
  return out;
}

function uniquePages(pages: ReviewPage[]): ReviewPage[] {
  const seen = new Set<string>();
  const out: ReviewPage[] = [];
  for (const page of pages) {
    const path = posixNormalize(page.path);
    if (seen.has(path)) {
      continue;
    }
    seen.add(path);
    out.push({ ...page, path });
  }
  return out;
}

async function isGitWorkspace(cwd: string): Promise<boolean> {
  try {
    const inside = (await runGit(["rev-parse", "--is-inside-work-tree"], { cwd })).trim();
    return inside === "true";
  } catch {
    return false;
  }
}

async function refExists(cwd: string, ref: string): Promise<boolean> {
  try {
    await runGit(["show-ref", "--verify", "--quiet", ref], { cwd });
    return true;
  } catch {
    return false;
  }
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.File) !== 0;
  } catch {
    return false;
  }
}

function workspaceFile(root: vscode.Uri, repoPath: string): vscode.Uri {
  return vscode.Uri.joinPath(root, ...repoPath.split("/").filter(Boolean));
}

function isPublishBlocked(err: unknown): boolean {
  return err instanceof PublishBlocked || (err instanceof Error && err.name === "PublishBlocked");
}
