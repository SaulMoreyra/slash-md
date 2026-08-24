import * as vscode from "vscode";
import { getDraftMeta } from "../sidecar/draftMeta";
import { DraftStore } from "../sidecar/draftStore";
import { docsLibraryRoot } from "../workspace/docsWorkspace";
import { ContentConfig, getContentConfig } from "../github/config";
import { ContentRepo } from "../github/contentRepo";
import { loadInbox, type InboxItem } from "../github/inbox";
import { attachStaging, listInReviewPages, type LocalDraft, type InReviewPage } from "../workspace/localDrafts";
import { labeledTitle } from "../domain/messaging";
import { posixBasename, posixJoin } from "../domain/paths";
import { getConfiguredSections, getSlashmdFile } from "../config/slashmdConfig";
import { isTemplateRepoPath, resolveTemplatesPath } from "../domain/templates";
import {
  getPull,
  listPullReviews,
  getCombinedStatus,
  listCheckRuns,
  type GithubPull,
  type GithubReview,
} from "../github/api";

export type { InboxItem };

export type HomeTreeNode = {
  kind: "folder" | "file";
  path: string;
  title: string;
  badge?: string;
  children?: HomeTreeNode[];
};

export type LoteReviewSummary = {
  prNumber: number;
  prUrl: string;
  title: string;
  branch: string;
  reviewers: string[];
  checksOk: boolean | null;
  approvals: number;
  state: "open" | "merged" | "closed";
};

export type HomeTreePayload = {
  repo: string;
  contentPath: string;
  needsAuth: boolean;
  needsInit: boolean;
  /** Tree came from the open workspace folder (no GitHub needed). */
  fromWorkspace: boolean;
  roots: HomeTreeNode[];
  drafts: LocalDraft[];
  selected: string[];
  inbox: InboxItem[];
  inboxError?: string;
  /** Local in_review + pr, so Home can enable Aprobar y Publicar. */
  canPublishBatch: boolean;
  /** Remote path to the index/portada file, if it exists. */
  indexPath?: string;
  /** Active lote PR summary when there are in_review pages with an open PR. */
  loteReview?: LoteReviewSummary;
};

export async function buildHomeTree(opts: {
  context: vscode.ExtensionContext;
  store: DraftStore;
  repos: ContentRepo;
  token?: string;
  viewerLogin?: string;
}): Promise<HomeTreePayload> {
  const config = getContentConfig();
  if (!config) {
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
    };
  }

  const workspaceRoot = await docsWorkspaceRoot(config);
  let files: string[] | undefined;
  let fromWorkspace = false;

  if (workspaceRoot) {
    files = await listLocalMarkdown(workspaceRoot, config.contentPath);
    fromWorkspace = true;
  } else if (opts.token) {
    await opts.repos.ensureFetched(config, opts.token);
    files = await opts.repos.listMarkdown(config, opts.token);
  } else {
    return {
      repo: config.repo,
      contentPath: config.contentPath,
      needsAuth: true,
      needsInit: false,
      fromWorkspace: false,
      roots: [],
      drafts: [],
      selected: [],
      inbox: [],
      canPublishBatch: false,
    };
  }

  const draftBadges = await draftBadgeMap(opts.context, opts.store);
  const titleCache = new Map<string, string>();
  const configured = getConfiguredSections(config.contentPath);

  const roots = await buildLevel(config.contentPath, files, configured, async (path) => {
    const cached = titleCache.get(path);
    if (cached) {
      return cached;
    }
    const title = await titleFor(opts, path, draftBadges.has(path), workspaceRoot);
    titleCache.set(path, title);
    return title;
  }, draftBadges);

  const staging = await attachStaging(
    opts.context,
    workspaceRoot,
    config.contentPath,
    files,
  );

  const inbox = await loadInbox({
    token: opts.token,
    config,
    viewerHint: opts.viewerLogin,
    workspaceRoot,
  });

  const inReviewPages = workspaceRoot
    ? await listInReviewPages(workspaceRoot, config.contentPath, files ?? [])
    : [];
  const canPublishBatch = inReviewPages.length > 0;

  const loteReview = await loadLoteReviewSummary(opts.token, config, inReviewPages);

  const indexCandidates = [
    posixJoin(config.contentPath, "README.md"),
    posixJoin(config.contentPath, "index.md"),
  ];
  const indexPath = files
    ? indexCandidates.find((c) => files.includes(c))
    : undefined;

  return {
    repo: config.repo,
    contentPath: config.contentPath,
    needsAuth: false,
    needsInit: false,
    fromWorkspace,
    roots,
    drafts: staging.drafts,
    selected: staging.selected,
    inbox: inbox.items,
    inboxError: inbox.error,
    canPublishBatch,
    indexPath,
    loteReview,
  };
}

export async function docsWorkspaceRoot(config: ContentConfig): Promise<vscode.Uri | undefined> {
  return docsLibraryRoot(config);
}

export async function listLocalMarkdown(folder: vscode.Uri, contentPath: string): Promise<string[]> {
  const root = contentPath
    ? vscode.Uri.joinPath(folder, ...contentPath.split("/").filter(Boolean))
    : folder;
  const templatesPath = resolveTemplatesPath(contentPath, getSlashmdFile().templatesPath);
  const out: string[] = [];
  await walkMd(root, contentPath, templatesPath, out);
  return out.sort();
}

export async function listLocalDirs(folder: vscode.Uri, contentPath: string): Promise<string[]> {
  const out = new Set<string>([contentPath]);
  const root = contentPath
    ? vscode.Uri.joinPath(folder, ...contentPath.split("/").filter(Boolean))
    : folder;
  await walkDirs(root, contentPath, out);
  return [...out].sort();
}

async function walkDirs(dir: vscode.Uri, prefix: string, out: Set<string>): Promise<void> {
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(dir);
  } catch {
    return;
  }
  for (const [name, type] of entries) {
    if (name.startsWith(".")) {
      continue;
    }
    if (type === vscode.FileType.Directory) {
      const rel = posixJoin(prefix, name);
      out.add(rel);
      await walkDirs(vscode.Uri.joinPath(dir, name), rel, out);
    }
  }
}

async function walkMd(dir: vscode.Uri, prefix: string, templatesPath: string, out: string[]): Promise<void> {
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(dir);
  } catch {
    return;
  }
  for (const [name, type] of entries) {
    if (name.startsWith(".")) {
      continue;
    }
    const rel = posixJoin(prefix, name);
    if (isTemplateRepoPath(rel, templatesPath)) {
      continue;
    }
    if (type === vscode.FileType.Directory) {
      await walkMd(vscode.Uri.joinPath(dir, name), rel, templatesPath, out);
    } else if (name.endsWith(".md") && !name.endsWith(".slash.md")) {
      out.push(rel);
    }
  }
}

async function titleFor(
  opts: { context: vscode.ExtensionContext; store: DraftStore; repos: ContentRepo },
  remotePath: string,
  preferDraft: boolean,
  workspaceRoot?: vscode.Uri,
): Promise<string> {
  const filename = posixBasename(remotePath);
  const config = getContentConfig();
  if (preferDraft) {
    for (const uri of await opts.store.listDrafts()) {
      const meta = getDraftMeta(opts.context, uri);
      if (meta.remotePath !== remotePath && meta.sourcePath !== remotePath) {
        continue;
      }
      try {
        const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
        return labeledTitle(text, filename);
      } catch {
        break;
      }
    }
  }
  if (workspaceRoot) {
    try {
      const uri = vscode.Uri.joinPath(workspaceRoot, ...remotePath.split("/").filter(Boolean));
      const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
      return labeledTitle(text, filename);
    } catch {
      // fall through
    }
  }
  if (!config) {
    return filename;
  }
  try {
    const text = await opts.repos.readFile(config, remotePath);
    return labeledTitle(text, filename);
  } catch {
    return filename;
  }
}

async function draftBadgeMap(
  context: vscode.ExtensionContext,
  store: DraftStore,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const uri of await store.listDrafts()) {
    const meta = getDraftMeta(context, uri);
    let badge = "editing";
    if (meta.pendingDelete) {
      badge = meta.prNumber ? `delete · #${meta.prNumber}` : "delete";
    } else if (meta.kind === "in_review" && meta.label) {
      badge = meta.label;
    } else if (meta.kind === "ahead") {
      badge = "editing · ahead";
    }
    if (meta.remotePath) {
      map.set(meta.remotePath, badge);
    }
    if (meta.sourcePath) {
      map.set(meta.sourcePath, badge);
    }
  }
  return map;
}

async function buildLevel(
  dir: string,
  files: string[],
  configuredSections: string[],
  titleOf: (path: string) => Promise<string>,
  badges: Map<string, string>,
): Promise<HomeTreeNode[]> {
  const folders = new Set<string>();
  const docs: string[] = [];

  for (const file of files) {
    const rel = relativeTo(dir, file);
    if (rel === undefined) {
      continue;
    }
    const slash = rel.indexOf("/");
    if (slash < 0) {
      docs.push(file);
    } else {
      folders.add(`${dir}/${rel.slice(0, slash)}`);
    }
  }

  for (const section of configuredSections) {
    if (section === dir) {
      continue;
    }
    const rel = relativeTo(dir, section);
    if (rel === undefined) {
      continue;
    }
    const slash = rel.indexOf("/");
    if (slash < 0) {
      folders.add(section);
    } else {
      folders.add(`${dir}/${rel.slice(0, slash)}`);
    }
  }

  const nodes: HomeTreeNode[] = [];
  for (const path of [...folders].sort()) {
    nodes.push({
      kind: "folder",
      path,
      title: posixBasename(path) || path,
      children: await buildLevel(path, files, configuredSections, titleOf, badges),
    });
  }
  for (const path of docs.sort()) {
    nodes.push({
      kind: "file",
      path,
      title: await titleOf(path),
      badge: badges.get(path),
    });
  }
  return nodes;
}

function relativeTo(dir: string, file: string): string | undefined {
  if (file === dir) {
    return undefined;
  }
  if (!dir) {
    return file;
  }
  const prefix = `${dir}/`;
  if (!file.startsWith(prefix)) {
    return undefined;
  }
  return file.slice(prefix.length);
}

async function loadLoteReviewSummary(
  token: string | undefined,
  config: ContentConfig,
  inReviewPages: InReviewPage[],
): Promise<LoteReviewSummary | undefined> {
  if (!token || inReviewPages.length === 0) {
    return undefined;
  }
  const prNumbers = [...new Set(inReviewPages.map((p) => p.pr).filter(Boolean))];
  if (prNumbers.length === 0) {
    return undefined;
  }
  const prNumber = prNumbers[0];
  try {
    const pr = await getPull(token, config, prNumber);
    const reviews = await listPullReviews(token, config, prNumber);
    const checksOk = await loadChecksOk(token, config, pr);
    const approvals = countApprovals(pr, reviews);
    const reviewers = [
      ...(pr.requested_reviewers ?? []).map((u) => u.login),
      ...(pr.requested_teams ?? []).map((t) => t.slug),
    ];
    const state: LoteReviewSummary["state"] = pr.merged || pr.merged_at
      ? "merged"
      : pr.state === "closed"
        ? "closed"
        : "open";
    return {
      prNumber: pr.number,
      prUrl: pr.html_url,
      title: pr.title,
      branch: pr.head.ref,
      reviewers,
      checksOk,
      approvals,
      state,
    };
  } catch {
    return undefined;
  }
}

async function loadChecksOk(
  token: string,
  config: ContentConfig,
  pr: GithubPull,
): Promise<boolean | null> {
  try {
    const [combined, runs] = await Promise.all([
      getCombinedStatus(token, config, pr.head.sha),
      listCheckRuns(token, config, pr.head.sha),
    ]);
    if (combined.state === "pending" || runs.some((r) => r.status !== "completed")) {
      return null;
    }
    if (combined.state === "failure" || combined.state === "error") {
      return false;
    }
    const hasFailed = runs.some(
      (r) => r.status === "completed" && r.conclusion !== "success" && r.conclusion !== "skipped" && r.conclusion !== "neutral",
    );
    return !hasFailed;
  } catch {
    return null;
  }
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
      count++;
    }
  }
  return count;
}
