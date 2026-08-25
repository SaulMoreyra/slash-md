import fs from "node:fs/promises";
import path from "node:path";
import { labeledTitle } from "@slash-md/core/messaging";
import { splitFrontmatter } from "@slash-md/core/frontmatter";
import type { HomeTreeNode, LocalDraft, LocalDraftBadge, InReviewPage } from "@slash-md/core/homeTypes";
import { groupHomeLevel } from "@slash-md/core/homeTree";
import { contentPathPrefix, posixBasename, posixJoin, posixNormalize } from "@slash-md/core/paths";
import { isTemplateRepoPath, resolveTemplatesPath } from "@slash-md/core/templates";
import { parsePrNumber } from "@slash-md/core/threadGate";
import type { ContentConfig, SlashmdFile } from "@slash-md/core/configTypes";
import { parsePorcelain, runGit, type GitPathState } from "./git";
import { configuredSections, fileExists, readSlashmd, readText, repoFile } from "./config";

export async function listLocalMarkdown(
  root: string,
  contentPath: string,
  templatesPath: string,
): Promise<string[]> {
  const prefix = contentPathPrefix(contentPath);
  const abs = prefix ? path.join(root, ...prefix.split("/")) : root;
  const out: string[] = [];
  await walkMd(abs, prefix, templatesPath, out);
  return out.sort();
}

async function walkMd(dir: string, prefix: string, templatesPath: string, out: string[]): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const rel = posixJoin(prefix, entry.name);
    if (isTemplateRepoPath(rel, templatesPath)) {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkMd(abs, rel, templatesPath, out);
    } else if (entry.name.endsWith(".md") && !entry.name.endsWith(".slash.md")) {
      out.push(rel);
    }
  }
}

export async function listLocalDrafts(root: string, contentPath: string, candidates: string[]): Promise<LocalDraft[]> {
  const git = await readContentGitStatus(root, contentPath);
  const drafts: LocalDraft[] = [];
  for (const rawPath of candidates) {
    const filePath = posixNormalize(rawPath);
    if (!isContentMarkdown(filePath, contentPath)) {
      continue;
    }
    let text: string;
    try {
      text = await readText(repoFile(root, filePath));
    } catch {
      continue;
    }
    const status = splitFrontmatter(text).fields.status.trim();
    const state = git.get(filePath) ?? { untracked: false, dirty: false };
    if (!isLocalDraft(status, state)) {
      continue;
    }
    drafts.push({
      path: filePath,
      title: labeledTitle(text, posixBasename(filePath)),
      badge: draftBadge(status, state),
    });
  }
  return drafts.sort((a, b) => a.path.localeCompare(b.path));
}

export async function listInReviewPages(
  root: string,
  contentPath: string,
  candidates: string[],
): Promise<InReviewPage[]> {
  const pages: InReviewPage[] = [];
  for (const rawPath of candidates) {
    const filePath = posixNormalize(rawPath);
    if (!isContentMarkdown(filePath, contentPath)) {
      continue;
    }
    let text: string;
    try {
      text = await readText(repoFile(root, filePath));
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
      path: filePath,
      title: labeledTitle(text, posixBasename(filePath)),
      pr,
      status: "in_review",
      reviewBranch: fields.reviewBranch.trim() || undefined,
    });
  }
  return pages.sort((a, b) => a.path.localeCompare(b.path));
}

function isLocalDraft(status: string, git: GitPathState): boolean {
  const kind = status.trim().toLowerCase();
  if (kind === "published") {
    return false;
  }
  if (kind === "draft") {
    return true;
  }
  return git.untracked || git.dirty;
}

function draftBadge(status: string, git: GitPathState): LocalDraftBadge {
  const kind = status.trim().toLowerCase();
  if (kind === "in_review") {
    return git.dirty ? "modificado" : "in review";
  }
  if (kind === "draft" || (!kind && git.untracked)) {
    return "draft";
  }
  return "modificado";
}

function isContentMarkdown(filePath: string, contentPath: string): boolean {
  if (!filePath.endsWith(".md") || filePath.endsWith(".slash.md")) {
    return false;
  }
  const root = posixNormalize(contentPath);
  if (!root) {
    return true;
  }
  return filePath === root || filePath.startsWith(`${root}/`);
}

async function readContentGitStatus(root: string, contentPath: string): Promise<Map<string, GitPathState>> {
  const scope = posixNormalize(contentPath) || ".";
  try {
    const stdout = await runGit(["status", "--porcelain", "--", scope], { cwd: root });
    return parsePorcelain(stdout);
  } catch {
    return new Map();
  }
}

export async function buildLevel(
  dir: string,
  files: string[],
  configured: string[],
  titleOf: (path: string) => Promise<string>,
): Promise<HomeTreeNode[]> {
  const { folders, files: docs } = groupHomeLevel(dir, files, configured);
  const nodes: HomeTreeNode[] = [];
  for (const folderPath of folders) {
    nodes.push({
      kind: "folder",
      path: folderPath,
      title: posixBasename(folderPath) || folderPath,
      children: await buildLevel(folderPath, files, configured, titleOf),
    });
  }
  for (const filePath of docs) {
    nodes.push({
      kind: "file",
      path: filePath,
      title: await titleOf(filePath),
    });
  }
  return nodes;
}

export async function titleFor(root: string, remotePath: string): Promise<string> {
  const filename = posixBasename(remotePath);
  try {
    const text = await readText(repoFile(root, remotePath));
    return labeledTitle(text, filename);
  } catch {
    return filename;
  }
}

export { fileExists, configuredSections, readSlashmd };
export type { SlashmdFile, ContentConfig };
