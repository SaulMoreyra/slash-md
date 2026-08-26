import { classifyUnmerged, parseLsFilesUnmerged, stripConflictMarkers, type ConflictChoice } from "@slash-md/core/conflictModel";
import type { ConflictFile, WikiSyncState, WikiSyncStatus } from "@slash-md/core/homeTypes";
import { labeledTitle } from "@slash-md/core/messaging";
import { posixBasename, posixNormalize } from "@slash-md/core/paths";
import { wikiSyncStatusFromPull } from "@slash-md/github/merge";
import { getPull } from "@slash-md/github/api";
import { currentAuth, resolveToken } from "./auth";
import { getContentConfig, readText, repoFile, writeText } from "./config";
import { GitError, isGitWorkspace, isMergeInProgress, runGit } from "./git";
import { getPublicationState } from "./publication";
import { getWorkspaceRoot } from "./session";

function requireRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre la carpeta de docs para continuar.");
  }
  return root;
}

export async function assertNotMerging(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    return;
  }
  if (await isMergeInProgress(root)) {
    throw new Error("Termina de actualizar esta publicación con la wiki antes de continuar.");
  }
}

export async function isUnmergedPath(cwd: string, repoPath: string): Promise<boolean> {
  const files = await listUnmerged(cwd);
  return files.some((file) => file.path === posixNormalize(repoPath));
}

async function listUnmerged(cwd: string): Promise<ConflictFile[]> {
  let stdout: string;
  try {
    stdout = await runGit(["ls-files", "-u"], { cwd });
  } catch {
    return [];
  }
  const entries = parseLsFilesUnmerged(stdout);
  const files: ConflictFile[] = [];
  for (const entry of entries) {
    const kind = classifyUnmerged(entry.stages, entry.path);
    const oursMarkdown = kind === "binary" ? null : await showStage(cwd, 2, entry.path);
    const theirsMarkdown = kind === "binary" ? null : await showStage(cwd, 3, entry.path);
    const titleSource = oursMarkdown ?? theirsMarkdown ?? "";
    files.push({
      path: entry.path,
      title: labeledTitle(titleSource, posixBasename(entry.path)),
      kind,
      oursMarkdown,
      theirsMarkdown,
    });
  }
  return files.toSorted((a, b) => a.path.localeCompare(b.path));
}

async function showStage(cwd: string, stage: 2 | 3, repoPath: string): Promise<string | null> {
  try {
    const raw = await runGit(["show", `:${stage}:${repoPath}`], { cwd });
    return stripConflictMarkers(raw);
  } catch {
    return null;
  }
}

export async function getConflictState(): Promise<WikiSyncState> {
  const root = getWorkspaceRoot();
  if (!root || !(await isGitWorkspace(root))) {
    return { status: "idle", files: [] };
  }
  const config = await getContentConfig(root);
  if (!config || config.mode !== "workspace") {
    return { status: "idle", files: [] };
  }

  if (await isMergeInProgress(root)) {
    return { status: "merging", files: await listUnmerged(root) };
  }

  const { publication } = await getPublicationState();
  if (!publication?.prNumber) {
    return { status: "idle", files: [] };
  }

  const token = await resolveToken();
  if (!token) {
    return { status: "idle", files: [] };
  }

  try {
    const pr = await getPull(token, config, publication.prNumber);
    const status = wikiSyncStatusFromPull(pr);
    return { status, files: [] };
  } catch {
    return { status: "idle", files: [] };
  }
}

export async function peekWikiSyncStatus(): Promise<WikiSyncStatus> {
  return (await getConflictState()).status;
}

export async function syncWithWiki(): Promise<WikiSyncState> {
  const root = requireRoot();
  if (!(await isGitWorkspace(root))) {
    throw new Error("The docs folder is not a Git repository.");
  }
  const config = await getContentConfig(root);
  if (!config || config.mode !== "workspace") {
    throw new Error("Wiki sync is workspace-only.");
  }
  const { publication } = await getPublicationState();
  if (!publication) {
    throw new Error("Mount a publication before updating from the wiki.");
  }
  if (await isMergeInProgress(root)) {
    return { status: "merging", files: await listUnmerged(root) };
  }

  const token = await resolveToken();
  try {
    await runGit(["fetch", "origin", config.defaultBranch], { cwd: root, token });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo traer la wiki. ${detail}`.trim());
  }

  try {
    await runGit(["merge", "--no-edit", `origin/${config.defaultBranch}`], { cwd: root });
  } catch (err) {
    if (!(err instanceof GitError) || !(await isMergeInProgress(root))) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
    await restoreWorkingTreeOurs(root);
    const files = await listUnmerged(root);
    if (files.length === 0) {
      await finishMergeCommit(root);
      await pushHead(root, token);
      return { status: "idle", files: [] };
    }
    return { status: "merging", files };
  }

  await pushHead(root, token);
  return { status: "idle", files: [] };
}

async function restoreWorkingTreeOurs(cwd: string): Promise<void> {
  const files = await listUnmerged(cwd);
  for (const file of files) {
    if (file.oursMarkdown != null) {
      await writeText(repoFile(cwd, file.path), file.oursMarkdown);
      continue;
    }
    try {
      await runGit(["rm", "--", file.path], { cwd });
    } catch {
      // already absent
    }
  }
}

export async function resolveConflict(repoPath: string, choice: ConflictChoice): Promise<WikiSyncState> {
  const root = requireRoot();
  const path = posixNormalize(repoPath);
  if (!path || path.includes("..")) {
    throw new Error("Invalid document path.");
  }
  if (!(await isMergeInProgress(root))) {
    throw new Error("No hay una actualización de la wiki en curso.");
  }

  const files = await listUnmerged(root);
  const file = files.find((item) => item.path === path);
  if (!file) {
    return { status: "merging", files };
  }

  if (typeof choice === "object") {
    await writeText(repoFile(root, path), choice.markdown);
    await runGit(["add", "--", path], { cwd: root });
    return remaining(root);
  }

  if (choice === "ours") {
    if (file.kind === "deleted_on_publication") {
      await runGit(["rm", "-f", "--", path], { cwd: root });
      return remaining(root);
    }
    if (file.oursMarkdown != null) {
      await writeText(repoFile(root, path), file.oursMarkdown);
      await runGit(["add", "--", path], { cwd: root });
    } else {
      await runGit(["checkout", "--ours", "--", path], { cwd: root });
      await runGit(["add", "--", path], { cwd: root });
    }
    return remaining(root);
  }

  if (file.kind === "deleted_on_wiki") {
    await runGit(["rm", "-f", "--", path], { cwd: root });
    return remaining(root);
  }
  if (file.theirsMarkdown != null) {
    await writeText(repoFile(root, path), file.theirsMarkdown);
    await runGit(["add", "--", path], { cwd: root });
  } else {
    await runGit(["checkout", "--theirs", "--", path], { cwd: root });
    await runGit(["add", "--", path], { cwd: root });
  }
  return remaining(root);
}

async function remaining(cwd: string): Promise<WikiSyncState> {
  const files = await listUnmerged(cwd);
  return { status: "merging", files };
}

export async function abortSyncWithWiki(): Promise<WikiSyncState> {
  const root = requireRoot();
  if (await isMergeInProgress(root)) {
    await runGit(["merge", "--abort"], { cwd: root });
  }
  return getConflictState();
}

export async function finishSyncWithWiki(): Promise<WikiSyncState> {
  const root = requireRoot();
  if (!(await isMergeInProgress(root))) {
    await pushHead(root, await resolveToken());
    return getConflictState();
  }
  const files = await listUnmerged(root);
  if (files.length > 0) {
    throw new Error("Todavía hay páginas por resolver.");
  }
  await finishMergeCommit(root);
  await pushHead(root, await resolveToken());
  return { status: "idle", files: [] };
}

async function finishMergeCommit(cwd: string): Promise<void> {
  const auth = await currentAuth();
  const author = auth?.login || "slash-md";
  await runGit(
    [
      "-c",
      `user.name=${author}`,
      "-c",
      `user.email=${author}@users.noreply.github.com`,
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--no-edit",
      "-m",
      "docs: sync publication with wiki",
    ],
    { cwd },
  );
}

async function pushHead(cwd: string, token: string | undefined): Promise<void> {
  if (!token) {
    throw new Error("Sign in to GitHub to update this publication.");
  }
  await runGit(["push", "-u", "origin", "HEAD"], { cwd, token });
}

export async function writeUnmergedWorkingTree(repoPath: string, markdown: string): Promise<void> {
  const root = requireRoot();
  const path = posixNormalize(repoPath);
  if (!(await isUnmergedPath(root, path))) {
    throw new Error("Esa página no está en conflicto.");
  }
  await writeText(repoFile(root, path), markdown);
}

export { readText, repoFile };
