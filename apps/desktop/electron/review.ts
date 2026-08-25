import { stampDocMeta } from "@slash-md/core/docMeta";
import { setFrontmatterField } from "@slash-md/core/frontmatter";
import { referencedImages } from "@slash-md/core/images";
import { posixNormalize } from "@slash-md/core/paths";
import {
  createPullRequest,
  findOpenPull,
  requestPullReviewers,
  type GithubPull,
} from "@slash-md/github/api";
import type { ReviewPreviewItem } from "@slash-md/core/homeProtocol";
import { labeledTitle } from "@slash-md/core/messaging";
import { posixBasename } from "@slash-md/core/paths";
import { currentAuth, resolveToken } from "./auth";
import { assertSafeRepoPath, fileExists, getContentConfig, readText, repoFile, writeText } from "./config";
import { GitError, isGitWorkspace, refExists, runGit, switchToBranch } from "./git";
import { getWorkspaceRoot, readStaging, writeStaging } from "./session";
import { listLocalDrafts, listLocalMarkdown } from "./workspace";
import { readSlashmd } from "./config";
import { resolveTemplatesPath } from "@slash-md/core/templates";

function yearMonth(at = new Date()): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}`;
}

function datedReviewBranch(at = new Date()): string {
  return `review/docs-${yearMonth(at)}-${String(at.getDate()).padStart(2, "0")}`;
}

function parseReviewerLogins(input: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of input.split(/[\s,]+/)) {
    const login = part.replace(/^@/, "").trim();
    if (!login || seen.has(login.toLowerCase())) {
      continue;
    }
    seen.add(login.toLowerCase());
    out.push(login);
  }
  return out;
}

function requireRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre la carpeta de docs para mandar a revisión.");
  }
  return root;
}

export async function previewReview(): Promise<ReviewPreviewItem[]> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured. Use Init before sending pages to review.");
  }
  const slashmd = await readSlashmd(root);
  const files = await listLocalMarkdown(root, config.contentPath, resolveTemplatesPath(config.contentPath, slashmd.templatesPath));
  const drafts = await listLocalDrafts(root, config.contentPath, files);
  const selected = new Set(readStaging(root));
  return drafts
    .filter((draft) => selected.has(draft.path))
    .map((draft) => ({
      path: draft.path,
      title: draft.title,
      badge: draft.badge,
      summary: draft.path,
    }));
}

export async function sendBatchToReview(rawReviewers = ""): Promise<{
  prNumber: number;
  prUrl: string;
  created: boolean;
  branch: string;
  paths: string[];
}> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  if (!config) {
    throw new Error("Repo not configured. Use Init before sending pages to review.");
  }
  if (config.mode === "personal") {
    throw new Error("Mandar a Revisión is workspace/PR-only. Personal mode publishes directly.");
  }
  if (!(await isGitWorkspace(root))) {
    throw new Error("The docs folder is not a Git repository.");
  }
  const selected = readStaging(root).map(posixNormalize).filter(Boolean);
  if (selected.length === 0) {
    throw new Error("Select at least one local draft to send to review.");
  }
  const slashmd = await readSlashmd(root);
  const files = await listLocalMarkdown(root, config.contentPath, resolveTemplatesPath(config.contentPath, slashmd.templatesPath));
  const drafts = await listLocalDrafts(root, config.contentPath, files);
  const live = new Set(drafts.map((draft) => draft.path));
  if (selected.some((item) => !live.has(item))) {
    throw new Error("Selection includes files that are not local drafts. Refresh and try again.");
  }
  const token = await resolveToken();
  if (!token) {
    throw new Error("Sign in to GitHub to send pages to review.");
  }
  const auth = await currentAuth();
  const author = auth?.login || "slash-md";
  const reviewers = parseReviewerLogins(rawReviewers);
  const month = yearMonth();
  const { branch, openPr } = await resolveReviewBranch(root, token, config, month);
  await switchToBranch(root, branch);

  await stampSelectedInReview(root, selected);
  const addPaths = await collectAddPaths(config, root, selected);
  assertAddList(addPaths, selected, true);
  await assertNoForeignStaged(root, addPaths);
  await runGit(["add", "--", ...addPaths], { cwd: root });
  await assertIndexIsLote(root, addPaths);

  const dirty = (await runGit(["status", "--porcelain", "--", ...addPaths], { cwd: root })).trim();
  let committed = false;
  if (dirty) {
    await commitLote(root, author, `docs: review ${month} (${selected.length} pages)`, addPaths);
    committed = true;
  } else if (!openPr) {
    throw new Error("No changes to review");
  }

  if (committed || !openPr) {
    await runGit(["push", "-u", "origin", "HEAD"], { cwd: root, token });
  }

  let created = false;
  let pr = openPr ?? (await findOpenPull(token, config, branch));
  if (!pr) {
    pr = await createPullRequest(token, config, {
      title: `Docs review ${month}`,
      head: branch,
      base: config.defaultBranch,
      body: selected.map((item) => `- ${item}`).join("\n"),
    });
    created = true;
  }

  if (reviewers.length > 0) {
    await requestPullReviewers(token, config, pr.number, reviewers);
  }

  const yamlChanged = await stampPrFields(root, selected, pr.number, branch);
  if (yamlChanged.length > 0) {
    assertAddList(yamlChanged, selected, false);
    await assertNoForeignStaged(root, yamlChanged);
    await runGit(["add", "--", ...yamlChanged], { cwd: root });
    await assertIndexIsLote(root, yamlChanged);
    const yamlDirty = (await runGit(["status", "--porcelain", "--", ...yamlChanged], { cwd: root })).trim();
    if (yamlDirty) {
      await commitLote(root, author, `docs: review ${month} (pr ${pr.number})`, yamlChanged);
      await runGit(["push", "-u", "origin", "HEAD"], { cwd: root, token });
    }
  }

  writeStaging(
    root,
    readStaging(root).filter((item) => !selected.includes(posixNormalize(item))),
  );

  return { prNumber: pr.number, prUrl: pr.html_url, created, branch, paths: selected };
}

async function resolveReviewBranch(
  cwd: string,
  token: string,
  config: { owner: string; name: string },
  month: string,
): Promise<{ branch: string; openPr?: GithubPull }> {
  const now = new Date();
  const monthly = `review/docs-${month}`;
  try {
    await runGit(["fetch", "origin", monthly], { cwd, token });
  } catch {
    // may not exist
  }
  const monthlyOpen = await findOpenPull(token, config, monthly);
  if (monthlyOpen) {
    return { branch: monthly, openPr: monthlyOpen };
  }
  if (await refExists(cwd, `refs/remotes/origin/${monthly}`)) {
    return nextFreeBranch(cwd, token, config, datedReviewBranch(now));
  }
  return { branch: monthly };
}

async function nextFreeBranch(
  cwd: string,
  token: string,
  config: { owner: string; name: string },
  base: string,
): Promise<{ branch: string; openPr?: GithubPull }> {
  const candidates = [base, ...Array.from({ length: 20 }, (_, i) => `${base}-${i + 2}`)];
  for (const branch of candidates) {
    try {
      await runGit(["fetch", "origin", branch], { cwd, token });
    } catch {
      // ignore
    }
    const openPr = await findOpenPull(token, config, branch);
    if (openPr) {
      return { branch, openPr };
    }
    if (!(await refExists(cwd, `refs/heads/${branch}`)) && !(await refExists(cwd, `refs/remotes/origin/${branch}`))) {
      return { branch };
    }
  }
  throw new Error(`Could not find a free review branch from ${base}.`);
}

async function stampSelectedInReview(root: string, selected: string[]): Promise<void> {
  for (const filePath of selected) {
    const abs = repoFile(root, filePath);
    const text = await readText(abs);
    const next = stampDocMeta(text, { status: "in_review", touchUpdated: true });
    if (next !== text) {
      await writeText(abs, next);
    }
  }
}

async function stampPrFields(root: string, selected: string[], prNumber: number, branch: string): Promise<string[]> {
  const changed: string[] = [];
  for (const filePath of selected) {
    const abs = repoFile(root, filePath);
    const text = await readText(abs);
    let next = setFrontmatterField(text, "pr", String(prNumber));
    next = setFrontmatterField(next, "reviewBranch", branch);
    if (next !== text) {
      await writeText(abs, next);
      changed.push(filePath);
    }
  }
  return changed;
}

async function collectAddPaths(
  config: { contentPath: string; owner: string; name: string; repo: string; defaultBranch: string; mode: "workspace" | "personal" },
  root: string,
  selected: string[],
): Promise<string[]> {
  const lote = new Set<string>();
  for (const filePath of selected) {
    lote.add(assertSafeRepoPath(config, filePath));
    const text = await readText(repoFile(root, filePath));
    for (const image of referencedImages(text, filePath)) {
      const safe = posixNormalize(image.repoPath.replace(/\\/g, "/").replace(/^\/+/, ""));
      if (!safe || safe.includes("..")) {
        continue;
      }
      if (await fileExists(repoFile(root, safe))) {
        lote.add(safe);
      }
    }
  }
  return [...lote];
}

function assertAddList(paths: string[], selectedMd: string[], requireAllSelected: boolean): void {
  const selected = new Set(selectedMd.map(posixNormalize));
  if (requireAllSelected) {
    for (const filePath of selected) {
      if (!paths.includes(filePath)) {
        throw new Error(`Refusing git add: selected page missing from lote (${filePath}).`);
      }
    }
  }
  for (const filePath of paths) {
    if (filePath === "-A" || filePath === "." || filePath === "--all" || filePath.includes("..")) {
      throw new Error(`Refusing unsafe git add path: ${filePath}`);
    }
    if (filePath.endsWith(".md") && !selected.has(posixNormalize(filePath))) {
      throw new Error(`Refusing git add: ${filePath} is not in the selected lote.`);
    }
  }
}

async function cachedNames(cwd: string): Promise<string[]> {
  return (await runGit(["diff", "--cached", "--name-only"], { cwd }))
    .split(/\r?\n/)
    .map((line) => posixNormalize(line.trim()))
    .filter(Boolean);
}

async function assertNoForeignStaged(cwd: string, lote: string[]): Promise<void> {
  const allowed = new Set(lote.map(posixNormalize));
  const extra = (await cachedNames(cwd)).filter((filePath) => !allowed.has(filePath));
  if (extra.length > 0) {
    throw new Error(`Other files are already staged (${extra.join(", ")}). Unstage them first.`);
  }
}

async function assertIndexIsLote(cwd: string, lote: string[]): Promise<void> {
  await assertNoForeignStaged(cwd, lote);
}

async function commitLote(cwd: string, author: string, message: string, paths: string[]): Promise<void> {
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

export { GitError, labeledTitle, posixBasename };
