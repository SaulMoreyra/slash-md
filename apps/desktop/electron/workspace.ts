import fs from "node:fs/promises";
import path from "node:path";
import { splitFrontmatter } from "@slash-md/core/frontmatter";
import type { ContentConfig, SlashmdFile } from "@slash-md/core/configTypes";
import { relativeToDir } from "@slash-md/core/homeTree";
import type { HomeTreeNode, InReviewPage, LocalDraft, PublicationState } from "@slash-md/core/homeTypes";
import { draftBadge, hasGitChanges, isLocalDraft } from "@slash-md/core/localDrafts";
import { labeledTitle } from "@slash-md/core/messaging";
import { contentPathPrefix, posixBasename, posixJoin, posixNormalize } from "@slash-md/core/paths";
import { collectPendingReviewMarkdown } from "@slash-md/core/reviewPaths";
import { parsePrNumber } from "@slash-md/core/threadGate";
import { parsePorcelain, refExists, runGit, type GitPathState } from "./git";
import { configuredSections, fileExists, readSlashmd, readText, repoFile } from "./config";

/**
 * Directories never worth walking for docs.
 *
 * `.gitignore` already covers most of these, but we cannot lean on it: the
 * workspace root is not necessarily a git repo. Opening a folder that merely
 * *contains* repos is a supported case, and there the ignore rules live one
 * level down where a root-level `git status` never sees them.
 */
const IGNORED_DIRS = new Set([
  "node_modules",
  "bower_components",
  "vendor",
  "dist",
  "build",
  "out",
  "target",
  "release",
  "coverage",
  "tmp",
  "__pycache__",
  "venv",
  ".venv",
]);

/**
 * Directories a single "does this hold any markdown?" probe may visit before it
 * gives up and hides the folder.
 *
 * The probe exists so the tree keeps showing only folders that contain docs,
 * which is what makes the sidebar readable. Without a cap it degenerates into
 * the full recursive walk this module used to do on every refresh. Measured on
 * a folder of 58 repos: the worst single level cost 123ms at this budget,
 * against 16s for the old eager walk.
 */
const PROBE_BUDGET = 2000;

/** Titles are read with bounded concurrency so a big docs tree cannot pin the event loop. */
const TITLE_CONCURRENCY = 32;

/** Directories read at once while walking. Bounded to keep memory flat. */
const WALK_CONCURRENCY = 16;

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]!);
    }
  });
  await Promise.all(workers);
  return out;
}

function isMarkdown(name: string): boolean {
  return name.endsWith(".md") && !name.endsWith(".slash.md");
}

function isWalkable(entry: import("node:fs").Dirent): boolean {
  return entry.isDirectory() && !entry.name.startsWith(".") && !IGNORED_DIRS.has(entry.name);
}

async function readDir(abs: string): Promise<import("node:fs").Dirent[]> {
  try {
    return await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * Every markdown file under `contentPath`.
 *
 * This is the only full walk left. It is no longer on the path that renders the
 * window — it backs the search index, which is built off the critical path and
 * cached.
 */
export async function listLocalMarkdown(root: string, contentPath: string): Promise<string[]> {
  const prefix = contentPathPrefix(contentPath);
  const abs = prefix ? path.join(root, ...prefix.split("/")) : root;
  const out: string[] = [];
  await walkMd(abs, prefix, out);
  return out.sort();
}

/**
 * Breadth-first, one level at a time, `WALK_CONCURRENCY` directories at a time.
 *
 * The sequential `await` this replaces is what made a full walk cost seconds.
 * Recursing with an unbounded `Promise.all` fixes the latency and replaces it
 * with a worse problem: fan-out proportional to the tree, which on a real
 * workspace exhausts the heap. Levels give the parallelism a natural bound.
 */
async function walkMd(dir: string, prefix: string, out: string[]): Promise<void> {
  let level: Array<{ abs: string; rel: string }> = [{ abs: dir, rel: prefix }];
  while (level.length > 0) {
    const next: Array<{ abs: string; rel: string }> = [];
    await mapWithLimit(level, WALK_CONCURRENCY, async (job) => {
      for (const entry of await readDir(job.abs)) {
        const rel = posixJoin(job.rel, entry.name);
        if (isWalkable(entry)) {
          next.push({ abs: path.join(job.abs, entry.name), rel });
        } else if (entry.isFile() && isMarkdown(entry.name)) {
          out.push(rel);
        }
      }
    });
    level = next;
  }
}

/** Whether `abs` holds any markdown, giving up after `budget` directories. */
async function hasMarkdownBelow(abs: string, budget = PROBE_BUDGET): Promise<boolean> {
  const queue = [abs];
  let visited = 0;
  while (queue.length > 0 && visited < budget) {
    const current = queue.shift()!;
    visited += 1;
    const entries = await readDir(current);
    for (const entry of entries) {
      if (entry.isFile() && isMarkdown(entry.name)) {
        return true;
      }
      if (isWalkable(entry)) {
        queue.push(path.join(current, entry.name));
      }
    }
  }
  return false;
}

/**
 * One level of the library tree: the markdown directly inside `dir`, plus the
 * subfolders that lead to more of it.
 *
 * Folders come back with `children` left undefined, which the renderer reads as
 * "not indexed yet" and fills in when the folder is opened.
 */
export async function listFolderLevel(
  root: string,
  dir: string,
  configured: string[] = [],
): Promise<HomeTreeNode[]> {
  const base = posixNormalize(dir);
  const abs = base ? path.join(root, ...base.split("/")) : root;
  const entries = await readDir(abs);

  const fileNames = entries.filter((entry) => entry.isFile() && isMarkdown(entry.name));
  const dirNames = entries.filter(isWalkable);

  // Sections declared in .slashmd.json stay visible even while still empty —
  // they are the scaffolding a team agreed on, not a discovered folder.
  const pinned = new Set(
    configured
      .map((section) => relativeToDir(base, section))
      .filter((rel): rel is string => rel !== undefined && rel.length > 0 && !rel.includes("/")),
  );

  const [files, keptDirs] = await Promise.all([
    Promise.all(
      fileNames.map(async (entry): Promise<HomeTreeNode> => {
        const filePath = posixJoin(base, entry.name);
        return { kind: "file", path: filePath, title: await titleFor(root, filePath) };
      }),
    ),
    Promise.all(
      dirNames.map(async (entry) => {
        const keep = pinned.has(entry.name) || (await hasMarkdownBelow(path.join(abs, entry.name)));
        return keep ? entry.name : undefined;
      }),
    ),
  ]);

  const folders: HomeTreeNode[] = keptDirs
    .filter((name): name is string => name !== undefined)
    .map((name) => ({ kind: "folder", path: posixJoin(base, name), title: name }));

  return [...folders.sort(byPath), ...files.sort(byPath)];
}

function byPath(a: HomeTreeNode, b: HomeTreeNode): number {
  return a.path.localeCompare(b.path);
}

/**
 * Pages with uncommitted changes.
 *
 * Every candidate that is not already in `git status` gets dropped by
 * `hasGitChanges`, so git's own output is the complete set — walking the disk
 * first only ever produced paths this function then threw away.
 */
export async function listLocalDrafts(root: string, contentPath: string): Promise<LocalDraft[]> {
  const git = await readContentGitStatus(root, contentPath);
  const drafts: LocalDraft[] = [];

  for (const [rawPath, state] of git) {
    const filePath = posixNormalize(rawPath);
    if (!isContentMarkdown(filePath, contentPath)) {
      continue;
    }
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
    for (const [rawPath, state] of git) {
      const filePath = posixNormalize(rawPath);
      if (!isContentMarkdown(filePath, contentPath)) continue;
      if (!state.dirty && !state.untracked) continue;
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
    // `-uall` lists untracked files one by one. Without it git collapses a new
    // folder into a single `?? dir/` entry, which used to be papered over by the
    // caller passing in a full disk walk.
    const stdout = await runGit(["status", "--porcelain", "-uall", "--", scope], { cwd: root });
    return parsePorcelain(stdout);
  } catch {
    return new Map();
  }
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

type SearchEntry = { path: string; title: string };
type SearchIndex = { key: string; entries: SearchEntry[] };

let cachedIndex: SearchIndex | null = null;
let inflightIndex: Promise<SearchEntry[]> | null = null;

/**
 * Flat path + title index behind the search palette.
 *
 * The tree is lazy, so search can no longer read what the sidebar happens to
 * have expanded. This is built once per workspace, off the render path, and
 * dropped whenever pages are written.
 */
export async function buildSearchIndex(root: string, contentPath: string): Promise<SearchEntry[]> {
  const key = `${root}::${posixNormalize(contentPath)}`;
  if (cachedIndex?.key === key) {
    return cachedIndex.entries;
  }
  if (inflightIndex) {
    return inflightIndex;
  }
  inflightIndex = (async () => {
    const files = await listLocalMarkdown(root, contentPath);
    const entries = await mapWithLimit(files, TITLE_CONCURRENCY, async (filePath) => ({
      path: filePath,
      title: await titleFor(root, filePath),
    }));
    cachedIndex = { key, entries };
    return entries;
  })();
  try {
    return await inflightIndex;
  } finally {
    inflightIndex = null;
  }
}

/** Called after any write that can add, remove or retitle a page. */
export function invalidateSearchIndex(): void {
  cachedIndex = null;
}
