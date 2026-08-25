import * as vscode from "vscode";
import { stampDocMeta } from "@slash-md/core/docMeta";
import { setFrontmatterField } from "@slash-md/core/frontmatter";
import { referencedImages } from "@slash-md/core/images";
import { listLocalDrafts, readStagingSelection, writeStagingSelection } from "../workspace/localDrafts";
import { posixNormalize } from "@slash-md/core/paths";
import { resolveCreateWorkspaceRoot } from "../workspace/docsWorkspace";
import { docsWorkspaceRoot, listLocalMarkdown } from "../home/homeTree";
import { ImageStore } from "../sidecar/imageStore";
import { getGithubSession } from "./auth";
import { ContentConfig, getContentConfig } from "./config";
import {
  GithubPull,
  createPullRequest,
  findOpenPull,
  requestPullReviewers,
} from "@slash-md/github/api";
import { GitError, runGit } from "./git";
import { datedReviewBranch, parseReviewerLogins, yearMonth } from "./reviewBatch";
import { assertSafeRepoPath } from "./review";

export type BatchReviewResult = {
  pr: GithubPull;
  branch: string;
  created: boolean;
  paths: string[];
};

type PreparedBatch = {
  context: vscode.ExtensionContext;
  config: ContentConfig;
  root: vscode.Uri;
  cwd: string;
  session: vscode.AuthenticationSession;
  selected: string[];
  reviewers: string[];
  month: string;
};

/**
 * Selected local drafts → one branch + one PR on the docs workspace git.
 * Does not use worktrees, submitReview, add -A, reset, stash, or merge.
 */
export async function sendBatchToReview(context: vscode.ExtensionContext): Promise<BatchReviewResult | undefined> {
  const prepared = await prepareBatchReview(context);
  if (!prepared) {
    return undefined;
  }
  try {
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Sending to review…" },
      async () => executeBatchReview(prepared),
    );
    await vscode.window.showInformationMessage(
      result.created
        ? `Opened PR #${result.pr.number} on ${result.branch}.`
        : `Updated PR #${result.pr.number} on ${result.branch}.`,
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showErrorMessage(`Review failed: ${message}`);
    return undefined;
  }
}

async function prepareBatchReview(context: vscode.ExtensionContext): Promise<PreparedBatch | undefined> {
  const config = getContentConfig();
  if (!config) {
    await vscode.window.showWarningMessage("Repo not configured. Use Init before sending pages to review.");
    return undefined;
  }
  if (config.mode === "personal") {
    await vscode.window.showInformationMessage(
      "Mandar a Revisión is workspace/PR-only. Personal mode publishes directly (no pull request).",
    );
    return undefined;
  }

  const root = (await docsWorkspaceRoot(config)) ?? (await resolveCreateWorkspaceRoot());
  if (!root) {
    await vscode.window.showWarningMessage("Open the docs folder to send pages to review.");
    return undefined;
  }
  if (!(await isGitWorkspace(root.fsPath))) {
    await vscode.window.showWarningMessage(
      "The docs workspace is not a Git repository. Open the docs repo as a folder to send pages to review.",
    );
    return undefined;
  }

  const selected = readStagingSelection(context).map(posixNormalize).filter(Boolean);
  if (selected.length === 0) {
    await vscode.window.showWarningMessage("Select at least one local draft to send to review.");
    return undefined;
  }

  const candidates = await listLocalMarkdown(root, config.contentPath);
  const drafts = await listLocalDrafts(root, config.contentPath, candidates);
  const live = new Set(drafts.map((draft) => draft.path));
  if (selected.some((path) => !live.has(path))) {
    await vscode.window.showWarningMessage(
      "Selection includes files that are not local drafts. Refresh Home and try again.",
    );
    return undefined;
  }

  const chosen = drafts.filter((draft) => selected.includes(draft.path));
  const titles = chosen.map((draft) => `• ${draft.title}`).join("\n");
  const confirm = await vscode.window.showInformationMessage(
    `Send ${chosen.length} page${chosen.length === 1 ? "" : "s"} to review?\n\n${titles}`,
    { modal: true },
    "Send to Review",
  );
  if (confirm !== "Send to Review") {
    return undefined;
  }

  const rawReviewers = await vscode.window.showInputBox({
    title: "Reviewers (optional)",
    prompt: "GitHub usernames, comma or space separated. Empty = CODEOWNERS only.",
    placeHolder: "@alice bob",
    ignoreFocusOut: true,
  });
  if (rawReviewers === undefined) {
    return undefined;
  }

  let session: vscode.AuthenticationSession;
  try {
    const next = await getGithubSession();
    if (!next) {
      await vscode.window.showWarningMessage("Sign in to GitHub to send pages to review.");
      return undefined;
    }
    session = next;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showWarningMessage(message || "Sign in to GitHub to send pages to review.");
    return undefined;
  }

  return {
    context,
    config,
    root,
    cwd: root.fsPath,
    session,
    selected,
    reviewers: parseReviewerLogins(rawReviewers),
    month: yearMonth(new Date()),
  };
}

async function executeBatchReview(prep: PreparedBatch): Promise<BatchReviewResult> {
  const { context, config, root, cwd, session, selected, reviewers, month } = prep;
  const token = session.accessToken;

  const { branch, openPr } = await resolveReviewBranch(cwd, token, config, month);
  await switchToBranch(cwd, branch);

  await saveSelectedEditors(root, selected);
  await stampSelectedInReview(root, selected);
  const addPaths = await collectAddPaths(context, config, root, selected);
  assertAddList(addPaths, selected, { requireAllSelected: true });

  await assertNoForeignStaged(cwd, addPaths);
  await gitAddLote(cwd, addPaths);
  await assertIndexIsLote(cwd, addPaths);

  const dirty = (await runGit(["status", "--porcelain", "--", ...addPaths], { cwd })).trim();
  let committed = false;
  if (dirty) {
    await commitLote(cwd, session, `docs: review ${month} (${selected.length} pages)`, addPaths);
    committed = true;
  } else if (!openPr) {
    throw new Error("No changes to review");
  }

  if (committed || !openPr) {
    await runGit(["push", "-u", "origin", "HEAD"], { cwd, token });
  }

  let created = false;
  let pr = openPr ?? (await findOpenPull(token, config, branch));
  if (!pr) {
    pr = await createPullRequest(token, config, {
      title: `Docs review ${month}`,
      head: branch,
      base: config.defaultBranch,
      body: selected.map((path) => `- ${path}`).join("\n"),
    });
    created = true;
  }

  if (reviewers.length > 0) {
    await requestPullReviewers(token, config, pr.number, reviewers);
  }

  const yamlChanged = await stampPrFields(root, selected, pr.number, branch);
  if (yamlChanged.length > 0) {
    assertAddList(yamlChanged, selected, { requireAllSelected: false });
    await assertNoForeignStaged(cwd, yamlChanged);
    await gitAddLote(cwd, yamlChanged);
    await assertIndexIsLote(cwd, yamlChanged);
    const yamlDirty = (await runGit(["status", "--porcelain", "--", ...yamlChanged], { cwd })).trim();
    if (yamlDirty) {
      await commitLote(cwd, session, `docs: review ${month} (pr ${pr.number})`, yamlChanged);
      await runGit(["push", "-u", "origin", "HEAD"], { cwd, token });
    }
  }

  const remaining = readStagingSelection(prep.context).filter((path) => !selected.includes(posixNormalize(path)));
  await writeStagingSelection(prep.context, remaining);

  if (created) {
    await vscode.env.openExternal(vscode.Uri.parse(pr.html_url));
  }

  return { pr, branch, created, paths: selected };
}

async function resolveReviewBranch(
  cwd: string,
  token: string,
  config: ContentConfig,
  month: string,
): Promise<{ branch: string; openPr?: GithubPull }> {
  const now = new Date();
  const monthly = `review/docs-${month}`;
  await tryFetchBranch(cwd, token, monthly);

  const monthlyOpen = await findOpenPull(token, config, monthly);
  if (monthlyOpen) {
    return { branch: monthly, openPr: monthlyOpen };
  }

  if (await refExists(cwd, `refs/remotes/origin/${monthly}`)) {
    const dated = datedReviewBranch(now);
    return nextFreeBranch(cwd, token, config, dated);
  }

  return { branch: monthly };
}

async function nextFreeBranch(
  cwd: string,
  token: string,
  config: ContentConfig,
  base: string,
): Promise<{ branch: string; openPr?: GithubPull }> {
  const candidates = [base, ...Array.from({ length: 20 }, (_, i) => `${base}-${i + 2}`)];
  for (const branch of candidates) {
    await tryFetchBranch(cwd, token, branch);
    const openPr = await findOpenPull(token, config, branch);
    if (openPr) {
      return { branch, openPr };
    }
    if (!(await branchExists(cwd, branch))) {
      return { branch };
    }
  }
  throw new Error(`Could not find a free review branch from ${base}.`);
}

async function tryFetchBranch(cwd: string, token: string, branch: string): Promise<void> {
  try {
    await runGit(["fetch", "origin", branch], { cwd, token });
  } catch {
    // Branch may not exist on origin yet.
  }
}

async function branchExists(cwd: string, branch: string): Promise<boolean> {
  if (await refExists(cwd, `refs/heads/${branch}`)) {
    return true;
  }
  return refExists(cwd, `refs/remotes/origin/${branch}`);
}

async function refExists(cwd: string, ref: string): Promise<boolean> {
  try {
    await runGit(["show-ref", "--verify", "--quiet", ref], { cwd });
    return true;
  } catch {
    return false;
  }
}

async function switchToBranch(cwd: string, branch: string): Promise<void> {
  const current = (await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd })).trim();
  if (current === branch) {
    return;
  }
  try {
    if (await refExists(cwd, `refs/heads/${branch}`)) {
      await runGit(["switch", branch], { cwd });
      return;
    }
    if (await refExists(cwd, `refs/remotes/origin/${branch}`)) {
      await runGit(["switch", "--track", `origin/${branch}`], { cwd });
      return;
    }
    await runGit(["switch", "-c", branch], { cwd });
  } catch (err) {
    throw switchFailed(err, branch);
  }
}

function switchFailed(err: unknown, branch: string): Error {
  const detail = err instanceof GitError ? err.stderr || err.message : err instanceof Error ? err.message : String(err);
  return new Error(
    `Cannot switch to ${branch} without overwriting local work. Unselected dirty files were left untouched. ${detail}`.trim(),
  );
}

async function saveSelectedEditors(root: vscode.Uri, selected: string[]): Promise<void> {
  const wanted = new Set(selected.map((path) => workspaceFile(root, path).fsPath));
  for (const doc of vscode.workspace.textDocuments) {
    if (doc.isDirty && wanted.has(doc.uri.fsPath)) {
      await doc.save();
    }
  }
}

async function stampSelectedInReview(root: vscode.Uri, selected: string[]): Promise<void> {
  for (const path of selected) {
    const uri = workspaceFile(root, path);
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    const next = stampDocMeta(text, { status: "in_review", touchUpdated: true });
    if (next !== text) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(next, "utf8"));
    }
  }
}

async function stampPrFields(
  root: vscode.Uri,
  selected: string[],
  prNumber: number,
  branch: string,
): Promise<string[]> {
  const changed: string[] = [];
  for (const path of selected) {
    const uri = workspaceFile(root, path);
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    let next = setFrontmatterField(text, "pr", String(prNumber));
    next = setFrontmatterField(next, "reviewBranch", branch);
    if (next !== text) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(next, "utf8"));
      changed.push(path);
    }
  }
  return changed;
}

async function collectAddPaths(
  context: vscode.ExtensionContext,
  config: ContentConfig,
  root: vscode.Uri,
  selected: string[],
): Promise<string[]> {
  const lote = new Set<string>();
  const store = new ImageStore(context);
  for (const path of selected) {
    lote.add(assertSafeRepoPath(config, path));
    const uri = workspaceFile(root, path);
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    for (const image of referencedImages(text, path)) {
      const safe = assertSafeImagePath(image.repoPath);
      if (await fileExists(root, safe)) {
        lote.add(safe);
        continue;
      }
      // Legacy uploads lived only in ImageStore — materialize onto disk before git add.
      const bytes = await store.read(safe);
      if (!bytes) {
        continue;
      }
      const dest = workspaceFile(root, safe);
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(dest, ".."));
      await vscode.workspace.fs.writeFile(dest, bytes);
      lote.add(safe);
    }
  }
  return [...lote];
}

function assertSafeImagePath(repoPath: string): string {
  const normalized = posixNormalize(repoPath.replace(/\\/g, "/").replace(/^\/+/, ""));
  if (!normalized || normalized.includes("..") || normalized.startsWith(".git/")) {
    throw new Error("Invalid image path.");
  }
  return normalized;
}

function assertAddList(
  paths: string[],
  selectedMd: string[],
  opts: { requireAllSelected: boolean },
): void {
  const selected = new Set(selectedMd.map(posixNormalize));
  if (opts.requireAllSelected) {
    for (const path of selected) {
      if (!paths.includes(path)) {
        throw new Error(`Refusing git add: selected page missing from lote (${path}).`);
      }
    }
  }
  for (const path of paths) {
    if (path === "-A" || path === "." || path === "--all" || path.includes("..")) {
      throw new Error(`Refusing unsafe git add path: ${path}`);
    }
    if (path.endsWith(".md") && !selected.has(posixNormalize(path))) {
      throw new Error(`Refusing git add: ${path} is not in the selected lote.`);
    }
  }
}

async function gitAddLote(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) {
    throw new Error("No paths to add.");
  }
  await runGit(["add", "--", ...paths], { cwd });
}

async function cachedNames(cwd: string): Promise<string[]> {
  return (await runGit(["diff", "--cached", "--name-only"], { cwd }))
    .split(/\r?\n/)
    .map((line) => posixNormalize(line.trim()))
    .filter(Boolean);
}

async function assertNoForeignStaged(cwd: string, lote: string[]): Promise<void> {
  const allowed = new Set(lote.map(posixNormalize));
  const extra = (await cachedNames(cwd)).filter((path) => !allowed.has(path));
  if (extra.length > 0) {
    throw new Error(
      `Other files are already staged (${extra.join(", ")}). Unstage them first. Unselected work was left untouched.`,
    );
  }
}

async function assertIndexIsLote(cwd: string, lote: string[]): Promise<void> {
  const allowed = new Set(lote.map(posixNormalize));
  const extra = (await cachedNames(cwd)).filter((path) => !allowed.has(path));
  if (extra.length > 0) {
    throw new Error(`Staged files outside the lote: ${extra.join(", ")}. Aborting without commit.`);
  }
}

async function commitLote(
  cwd: string,
  session: vscode.AuthenticationSession,
  message: string,
  paths: string[],
): Promise<void> {
  const author = session.account.label || "slash-md";
  await runGit(
    [
      "-c",
      `user.name=${author}`,
      "-c",
      `user.email=${author}@users.noreply.github.com`,
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      message,
      "--",
      ...paths,
    ],
    { cwd },
  );
}

async function isGitWorkspace(cwd: string): Promise<boolean> {
  try {
    const inside = (await runGit(["rev-parse", "--is-inside-work-tree"], { cwd })).trim();
    return inside === "true";
  } catch {
    return false;
  }
}

async function fileExists(root: vscode.Uri, repoPath: string): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(workspaceFile(root, repoPath));
    return (stat.type & vscode.FileType.File) !== 0;
  } catch {
    return false;
  }
}

function workspaceFile(root: vscode.Uri, repoPath: string): vscode.Uri {
  return vscode.Uri.joinPath(root, ...repoPath.split("/").filter(Boolean));
}
