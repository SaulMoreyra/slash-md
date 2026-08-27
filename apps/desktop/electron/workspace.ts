import fs from "node:fs/promises";
import path from "node:path";
import { splitFrontmatter } from "@slash-md/core/frontmatter";
import type { ContentConfig, SlashmdFile } from "@slash-md/core/configTypes";
import { groupHomeLevel } from "@slash-md/core/homeTree";
import type { HomeTreeNode, InReviewPage, LocalDraft, PublicationState } from "@slash-md/core/homeTypes";
import { draftBadge, hasGitChanges, isLocalDraft } from "@slash-md/core/localDrafts";
import { labeledTitle } from "@slash-md/core/messaging";
import { contentPathPrefix, posixBasename, posixJoin, posixNormalize } from "@slash-md/core/paths";
import { collectPendingReviewMarkdown } from "@slash-md/core/reviewPaths";
import { parsePrNumber } from "@slash-md/core/threadGate";
import { parsePorcelain, refExists, runGit, type GitPathState } from "./git";
import { configuredSections, fileExists, readSlashmd, readText, repoFile } from "./config";

export async function listLocalMarkdown(root: string, contentPath: string): Promise<string[]> {
  const prefix = contentPathPrefix(contentPath);
  const abs = prefix ? path.join(root, ...prefix.split("/")) : root;
  const out: string[] = [];
  await walkMd(abs, prefix, out);
  return out.sort();
}

async function walkMd(dir: string, prefix: string, out: string[]): Promise<void> {
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
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkMd(abs, rel, out);
    } else if (entry.name.endsWith(".md") && !entry.name.endsWith(".slash.md")) {
      out.push(rel);
    }
  }
}

export async function listLocalDrafts(
  root: string,
  contentPath: string,
  candidates: string[],
): Promise<LocalDraft[]> {
  const git = await readContentGitStatus(root, contentPath);
  const deletedPaths = [...git.entries()]
    .filter(([, state]) => state.deleted)
    .map(([filePath]) => filePath);
  const allPaths = [...new Set([...candidates, ...deletedPaths])];
  const drafts: LocalDraft[] = [];

  for (const rawPath of allPaths) {
    const filePath = posixNormalize(rawPath);
    if (!isContentMarkdown(filePath, contentPath)) {
      continue;
    }
    const state = git.get(filePath) ?? { untracked: false, dirty: false, deleted: false };
    if (!hasGitChanges(state)) {
      continue;
    }

    if (state.deleted) {
      const status = await statusFromHead(root, filePath);
      if (!isLocalDraft(status, state)) {
        continue;
      }
      drafts.push({
        path: filePath,
        title: await titleForDeleted(root, filePath),
        badge: draftBadge(status, state),
      });
      continue;
    }

    let text: string;
    try {
      text = await readText(repoFile(root, filePath));
    } catch {
      continue;
    }
    const status = splitFrontmatter(text).fields.status.trim();
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

async function statusFromHead(root: string, filePath: string): Promise<string> {
  try {
    const text = await runGit(["show", `HEAD:${filePath}`], { cwd: root });
    return splitFrontmatter(text).fields.status.trim();
  } catch {
    return "";
  }
}

async function titleForDeleted(root: string, filePath: string): Promise<string> {
  try {
    const text = await runGit(["show", `HEAD:${filePath}`], { cwd: root });
    return labeledTitle(text, posixBasename(filePath));
  } catch {
    return posixBasename(filePath);
  }
}

export async function listPendingReviewMarkdown(
  root: string,
  contentPath: string,
  defaultBranch: string,
  pubBranch: string,
): Promise<string[]> {
  const scope = posixNormalize(contentPath) || ".";
  const porcelainOutput = await runGit(["status", "--porcelain", "--", scope], { cwd: root }).catch(
    () => "",
  );

  let diffOutput = "";
  const base = await pendingReviewDiffBase(root, pubBranch, defaultBranch);
  if (base) {
    try {
      diffOutput = await runGit(
        ["diff", "--name-only", "--diff-filter=ACMR", `${base}..HEAD`, "--", scope],
        { cwd: root },
      );
    } catch {
      diffOutput = "";
    }
  }

  return collectPendingReviewMarkdown(diffOutput.split(/\r?\n/), [...parsePorcelain(porcelainOutput).keys()]);
}

async function pendingReviewDiffBase(
  root: string,
  pubBranch: string,
  defaultBranch: string,
): Promise<string | undefined> {
  if (await refExists(root, `refs/remotes/origin/${pubBranch}`)) {
    return `origin/${pubBranch}`;
  }
  if (await refExists(root, `refs/remotes/origin/${defaultBranch}`)) {
    return `origin/${defaultBranch}`;
  }
  if (await refExists(root, `refs/heads/${defaultBranch}`)) {
    return defaultBranch;
  }
  return undefined;
}

export async function listInReviewPages(
  root: string,
  contentPath: string,
  candidates: string[],
  publication?: PublicationState | null,
): Promise<InReviewPage[]> {
  const pages: InReviewPage[] = [];

  if (publication?.prNumber) {
    const git = await readContentGitStatus(root, contentPath);
    for (const rawPath of candidates) {
      const filePath = posixNormalize(rawPath);
      if (!isContentMarkdown(filePath, contentPath)) continue;
      const state = git.get(filePath);
      if (!state?.dirty && !state?.untracked) continue;
      let title: string;
      try {
        const text = await readText(repoFile(root, filePath));
        title = labeledTitle(text, posixBasename(filePath));
      } catch {
        title = posixBasename(filePath);
      }
      pages.push({
        path: filePath,
        title,
        pr: publication.prNumber,
        status: "in_review",
        reviewBranch: publication.branch,
      });
    }
    if (pages.length > 0) {
      return pages.sort((a, b) => a.path.localeCompare(b.path));
    }
  }

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
    const pr = parsePrNumber(fields.pr) ?? publication?.prNumber;
    if (!pr) {
      continue;
    }
    pages.push({
      path: filePath,
      title: labeledTitle(text, posixBasename(filePath)),
      pr,
      status: "in_review",
      reviewBranch: fields.reviewBranch.trim() || publication?.branch || undefined,
    });
  }
  return pages.sort((a, b) => a.path.localeCompare(b.path));
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
