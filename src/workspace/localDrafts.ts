import * as vscode from "vscode";
import { splitFrontmatter } from "../domain/frontmatter";
import { runGit } from "../github/git";
import { labeledTitle } from "../domain/messaging";
import { posixBasename, posixNormalize } from "../domain/paths";
import { parsePrNumber } from "../editor/threadGate";

export const STAGING_SELECTION_KEY = "slashMd.stagingSelection";

export type LocalDraftBadge = "draft" | "modificado" | "in review";

export type LocalDraft = {
  path: string;
  title: string;
  badge: LocalDraftBadge;
};

export type InReviewPage = {
  path: string;
  title: string;
  pr: number;
  status: "in_review";
  reviewBranch?: string;
};

export type GitPathState = {
  untracked: boolean;
  dirty: boolean;
};

export function readStagingSelection(context: vscode.ExtensionContext): string[] {
  const raw = context.globalState.get<unknown>(STAGING_SELECTION_KEY);
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || !item.trim()) {
      continue;
    }
    const path = posixNormalize(item);
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    out.push(path);
  }
  return out;
}

export async function writeStagingSelection(
  context: vscode.ExtensionContext,
  paths: string[],
): Promise<void> {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of paths) {
    const path = posixNormalize(item);
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    unique.push(path);
  }
  await context.globalState.update(STAGING_SELECTION_KEY, unique);
}

export async function toggleStagingPath(
  context: vscode.ExtensionContext,
  path: string,
): Promise<void> {
  const normalized = posixNormalize(path);
  if (!normalized) {
    return;
  }
  const stored = readStagingSelection(context);
  const next = stored.includes(normalized)
    ? stored.filter((item) => item !== normalized)
    : [...stored, normalized];
  await writeStagingSelection(context, next);
}

export async function listLocalDrafts(
  root: vscode.Uri,
  contentPath: string,
  candidates: string[],
): Promise<LocalDraft[]> {
  const git = await readContentGitStatus(root, contentPath);
  const drafts: LocalDraft[] = [];

  for (const rawPath of candidates) {
    const path = posixNormalize(rawPath);
    if (!isContentMarkdown(path, contentPath)) {
      continue;
    }
    let text: string;
    try {
      const uri = vscode.Uri.joinPath(root, ...path.split("/").filter(Boolean));
      text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    } catch {
      continue;
    }
    const status = splitFrontmatter(text).fields.status.trim();
    const state = git.get(path) ?? { untracked: false, dirty: false };
    if (!isLocalDraft(status, state)) {
      continue;
    }
    drafts.push({
      path,
      title: labeledTitle(text, posixBasename(path)),
      badge: draftBadge(status, state),
    });
  }

  return drafts.sort((a, b) => a.path.localeCompare(b.path));
}

export async function listInReviewPages(
  root: vscode.Uri,
  contentPath: string,
  candidates: string[],
): Promise<InReviewPage[]> {
  const pages: InReviewPage[] = [];
  for (const rawPath of candidates) {
    const path = posixNormalize(rawPath);
    if (!isContentMarkdown(path, contentPath)) {
      continue;
    }
    let text: string;
    try {
      const uri = vscode.Uri.joinPath(root, ...path.split("/").filter(Boolean));
      text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    } catch {
      continue;
    }
    const fields = splitFrontmatter(text).fields;
    if (fields.status.trim().toLowerCase() !== "in_review") {
      continue;
    }
    const pr = parsePrNumber(fields.pr);
    if (!pr) {
      continue;
    }
    pages.push({
      path,
      title: labeledTitle(text, posixBasename(path)),
      pr,
      status: "in_review",
      reviewBranch: fields.reviewBranch.trim() || undefined,
    });
  }
  return pages.sort((a, b) => a.path.localeCompare(b.path));
}

export async function attachStaging(
  context: vscode.ExtensionContext,
  root: vscode.Uri | undefined,
  contentPath: string,
  candidates: string[],
): Promise<{ drafts: LocalDraft[]; selected: string[] }> {
  const stored = readStagingSelection(context);
  if (!root) {
    return { drafts: [], selected: stored };
  }
  const drafts = await listLocalDrafts(root, contentPath, candidates);
  const live = new Set(drafts.map((draft) => draft.path));
  const selected = stored.filter((path) => live.has(path));
  if (selected.length !== stored.length) {
    await writeStagingSelection(context, selected);
  }
  return { drafts, selected };
}

export function isLocalDraft(status: string, git: GitPathState): boolean {
  const kind = status.trim().toLowerCase();
  if (kind === "published") {
    return false;
  }
  if (kind === "draft") {
    return true;
  }
  return git.untracked || git.dirty;
}

export function draftBadge(status: string, git: GitPathState): LocalDraftBadge {
  const kind = status.trim().toLowerCase();
  if (kind === "in_review") {
    return git.dirty ? "modificado" : "in review";
  }
  if (kind === "draft" || (!kind && git.untracked)) {
    return "draft";
  }
  return "modificado";
}

export function parsePorcelain(stdout: string): Map<string, GitPathState> {
  const map = new Map<string, GitPathState>();
  for (const line of stdout.split(/\r?\n/)) {
    if (!line) {
      continue;
    }
    const parsed = parsePorcelainLine(line);
    if (!parsed || parsed.xy === "!!") {
      continue;
    }
    const untracked = parsed.xy === "??";
    map.set(parsed.path, { untracked, dirty: true });
  }
  return map;
}

function parsePorcelainLine(line: string): { xy: string; path: string } | undefined {
  if (line.length < 4) {
    return undefined;
  }
  const xy = line.slice(0, 2);
  const rest = line.slice(3);
  const path = xy[0] === "R" || xy[0] === "C" ? renameDestination(rest) : unquoteGitPath(rest);
  const normalized = posixNormalize(path);
  if (!normalized) {
    return undefined;
  }
  return { xy, path: normalized };
}

function renameDestination(rest: string): string {
  const sep = " -> ";
  const idx = rest.lastIndexOf(sep);
  if (idx < 0) {
    return unquoteGitPath(rest);
  }
  return unquoteGitPath(rest.slice(idx + sep.length));
}

function unquoteGitPath(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return value;
}

function isContentMarkdown(path: string, contentPath: string): boolean {
  if (!path.endsWith(".md") || path.endsWith(".slash.md")) {
    return false;
  }
  const root = posixNormalize(contentPath);
  if (!root) {
    return true;
  }
  return path === root || path.startsWith(`${root}/`);
}

async function readContentGitStatus(
  root: vscode.Uri,
  contentPath: string,
): Promise<Map<string, GitPathState>> {
  const scope = posixNormalize(contentPath) || ".";
  try {
    const stdout = await runGit(["status", "--porcelain", "--", scope], { cwd: root.fsPath });
    return parsePorcelain(stdout);
  } catch {
    return new Map();
  }
}
