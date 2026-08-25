import * as vscode from "vscode";
import { getDraftMeta } from "../sidecar/draftMeta";
import { referencedImages } from "@slash-md/core/images";
import { rewriteLinksTo } from "@slash-md/core/links";
import { displayTitle } from "@slash-md/core/messaging";
import { posixJoin } from "@slash-md/core/paths";
import { slugify, reviewBranchName } from "@slash-md/core/slug";
import { docsLibraryRoot } from "../workspace/docsWorkspace";
import { readImageBytesForReview } from "../editor/imageHost";
import { ContentConfig } from "./config";
import { ContentRepo } from "./contentRepo";
import { runGit } from "./git";
import {
  GithubPull,
  createPullRequest,
  findOpenPull,
  getPull,
  listPullReviews,
  reviewBarLabel,
} from "@slash-md/github/api";

export type ReviewResult = {
  pr: GithubPull;
  label: string;
  remotePath: string;
  branch: string;
  headOid: string;
  created: boolean;
  committed: boolean;
};

export async function submitReview(opts: {
  context: vscode.ExtensionContext;
  repos: ContentRepo;
  config: ContentConfig;
  session: vscode.AuthenticationSession;
  document: vscode.TextDocument;
  markdown: string;
}): Promise<ReviewResult> {
  const { context, repos, config, session, document, markdown } = opts;
  const token = session.accessToken;
  const filename = document.uri.path.split("/").pop() ?? "draft";
  const title = displayTitle(markdown, filename);
  const meta = getDraftMeta(context, document.uri);

  const remotePath = resolveRemotePath(config, meta.remotePath, title);
  const branch = await resolveBranch(token, config, meta.reviewBranch, meta.prNumber, slugify(title));
  const pendingDelete = Boolean(meta.pendingDelete);

  const wt = await repos.ensureReviewWorktree(config, token, branch);
  const staged = await materializeDoc({
    context,
    config,
    worktree: wt,
    markdown,
    remotePath,
    sourcePath: meta.sourcePath,
    pendingDelete,
  });
  if (!pendingDelete) {
    await runGit(["add", "--", ...staged], { cwd: wt });
  }

  const dirty = (await runGit(["status", "--porcelain", "--", ...staged], { cwd: wt })).trim();
  let committed = false;
  if (dirty) {
    const author = session.account.label || "slash-md";
    const commitMsg = pendingDelete
      ? `docs: delete ${remotePath}`
      : `docs: ${title.replace(/\s+/g, " ").trim()}`;
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
        commitMsg,
        "--",
        ...staged,
      ],
      { cwd: wt },
    );
    committed = true;
  }

  if (!committed && !meta.prNumber) {
    const existing = await findOpenPull(token, config, branch);
    if (!existing) {
      throw new Error("No changes from GitHub to open a review.");
    }
  }

  await runGit(["push", "-u", "origin", "HEAD"], { cwd: wt, token });
  const headOid = (await runGit(["rev-parse", "HEAD"], { cwd: wt })).trim();

  let created = false;
  let pr: GithubPull | undefined;
  if (meta.prNumber) {
    pr = await getPull(token, config, meta.prNumber);
    if (pr.state !== "open") {
      pr = undefined;
    }
  }
  if (!pr) {
    pr = await findOpenPull(token, config, branch);
  }
  if (!pr) {
    pr = await createPullRequest(token, config, {
      title,
      head: branch,
      base: config.defaultBranch,
      body: "Proposed with Slash MD.",
    });
    created = true;
    pr = await getPull(token, config, pr.number);
  }

  const reviews = await listPullReviews(token, config, pr.number);
  return {
    pr,
    label: reviewBarLabel(pr, reviews),
    remotePath,
    branch,
    headOid: pr.head.sha || headOid,
    created,
    committed,
  };
}

async function resolveBranch(
  token: string,
  config: ContentConfig,
  reviewBranch: string | undefined,
  prNumber: number | undefined,
  slug: string,
): Promise<string> {
  if (reviewBranch) {
    if (prNumber) {
      try {
        const pr = await getPull(token, config, prNumber);
        if (pr.state === "open") {
          return reviewBranch;
        }
      } catch {
        return reviewBranch;
      }
    } else {
      const open = await findOpenPull(token, config, reviewBranch);
      if (open) {
        return reviewBranch;
      }
    }
  }
  return reviewBranchName(slug);
}

export function assertSafeRepoPath(config: ContentConfig, repoPath: string): string {
  const normalized = repoPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.startsWith(".git/")) {
    throw new Error("Invalid document path.");
  }
  if (!normalized.endsWith(".md") || normalized.endsWith(".slash.md")) {
    throw new Error("Document must be a .md in the docs repo.");
  }
  const root = config.contentPath;
  if (root && normalized !== root && !normalized.startsWith(`${root}/`)) {
    throw new Error(`Document must live under ${root}/.`);
  }
  return normalized;
}

export function resolveRemotePath(config: ContentConfig, existing: string | undefined, title: string): string {
  if (existing) {
    return assertSafeRepoPath(config, existing);
  }
  const fileName = `${slugify(title)}.md`;
  const next = config.contentPath ? `${config.contentPath}/${fileName}` : fileName;
  return assertSafeRepoPath(config, next);
}

async function writeRepoFile(worktree: string, repoPath: string, text: string): Promise<void> {
  await writeRepoBytes(worktree, repoPath, Buffer.from(text, "utf8"));
}

async function writeRepoBytes(worktree: string, repoPath: string, bytes: Uint8Array): Promise<void> {
  const uri = vscode.Uri.file(worktree);
  const file = vscode.Uri.joinPath(uri, ...repoPath.split("/").filter(Boolean));
  await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(file, ".."));
  await vscode.workspace.fs.writeFile(file, bytes);
}

export async function materializeDoc(opts: {
  context: vscode.ExtensionContext;
  config: ContentConfig;
  worktree: string;
  markdown: string;
  remotePath: string;
  sourcePath?: string;
  pendingDelete?: boolean;
}): Promise<string[]> {
  if (opts.pendingDelete) {
    const path = opts.sourcePath && opts.sourcePath !== opts.remotePath ? opts.sourcePath : opts.remotePath;
    try {
      await runGit(["rm", "--", path], { cwd: opts.worktree });
    } catch {
      // Already missing in the worktree.
    }
    return [path];
  }

  const staged = new Set<string>([opts.remotePath]);
  await writeRepoFile(opts.worktree, opts.remotePath, opts.markdown);

  const library = await docsLibraryRoot(opts.config);
  for (const img of referencedImages(opts.markdown, opts.remotePath)) {
    const bytes = await readImageBytesForReview(opts.context, img.repoPath, library);
    if (!bytes) {
      continue;
    }
    await writeRepoBytes(opts.worktree, img.repoPath, bytes);
    staged.add(img.repoPath);
  }

  const fromPath = opts.sourcePath;
  if (fromPath && fromPath !== opts.remotePath) {
    const others = await listWorktreeMarkdown(opts.worktree, opts.config.contentPath);
    for (const file of others) {
      if (file === opts.remotePath || file === fromPath) {
        continue;
      }
      const uri = worktreeFile(opts.worktree, file);
      let text: string;
      try {
        text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
      } catch {
        continue;
      }
      const next = rewriteLinksTo(text, file, fromPath, opts.remotePath);
      if (next === text) {
        continue;
      }
      await writeRepoFile(opts.worktree, file, next);
      staged.add(file);
    }
    try {
      await runGit(["rm", "--", fromPath], { cwd: opts.worktree });
      staged.add(fromPath);
    } catch {
      // New docs never existed at the old path.
    }
  }

  return [...staged];
}

async function listWorktreeMarkdown(worktree: string, contentPath: string): Promise<string[]> {
  const root = worktreeFile(worktree, contentPath);
  const out: string[] = [];
  await walkMd(root, contentPath, out);
  return out;
}

async function walkMd(dir: vscode.Uri, prefix: string, out: string[]): Promise<void> {
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
    if (type === vscode.FileType.Directory) {
      await walkMd(vscode.Uri.joinPath(dir, name), rel, out);
    } else if (name.endsWith(".md") && !name.endsWith(".slash.md")) {
      out.push(rel);
    }
  }
}

function worktreeFile(worktree: string, repoPath: string): vscode.Uri {
  return vscode.Uri.joinPath(vscode.Uri.file(worktree), ...repoPath.split("/").filter(Boolean));
}
