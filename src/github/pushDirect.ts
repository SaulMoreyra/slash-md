import * as vscode from "vscode";
import { getDraftMeta } from "../draftMeta";
import { displayTitle } from "../messaging";
import { ContentConfig } from "./config";
import { ContentRepo } from "./contentRepo";
import { GitError, runGit } from "./git";
import { materializeDoc, resolveRemotePath } from "./review";

export type DirectPublishResult = {
  remotePath: string;
  headOid: string;
  publishedUrl: string;
  committed: boolean;
  label: string;
};

/**
 * Personal mode: commit on defaultBranch and push — no PR.
 */
export async function pushDirect(opts: {
  context: vscode.ExtensionContext;
  repos: ContentRepo;
  config: ContentConfig;
  session: vscode.AuthenticationSession;
  document: vscode.TextDocument;
  markdown: string;
}): Promise<DirectPublishResult> {
  const { context, repos, config, session, document, markdown } = opts;
  const token = session.accessToken;
  const filename = document.uri.path.split("/").pop() ?? "draft";
  const title = displayTitle(markdown, filename);
  const meta = getDraftMeta(context, document.uri);
  const pendingDelete = Boolean(meta.pendingDelete);
  const remotePath = resolveRemotePath(config, meta.remotePath, title);
  const branch = config.defaultBranch;

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

  if (!committed && !pendingDelete) {
    const headOid = (await runGit(["rev-parse", "HEAD"], { cwd: wt })).trim();
    return {
      remotePath,
      headOid,
      publishedUrl: blobUrl(config, remotePath),
      committed: false,
      label: "published",
    };
  }

  if (!committed && pendingDelete) {
    throw new Error("Nothing to delete on GitHub.");
  }

  try {
    await runGit(["push", "origin", `HEAD:${branch}`], { cwd: wt, token });
  } catch (err) {
    throw mapPushFailure(err);
  }

  const headOid = (await runGit(["rev-parse", "HEAD"], { cwd: wt })).trim();
  return {
    remotePath,
    headOid,
    publishedUrl: blobUrl(config, remotePath),
    committed: true,
    label: pendingDelete ? "deleted" : "published",
  };
}

function blobUrl(config: ContentConfig, remotePath: string): string {
  return `https://github.com/${config.owner}/${config.name}/blob/${config.defaultBranch}/${remotePath}`;
}

function mapPushFailure(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const stderr = err instanceof GitError ? err.stderr : message;
  const text = `${message}\n${stderr}`.toLowerCase();
  if (/protected branch|cannot push|not allowed to push|permission denied|rejected/.test(text)) {
    return new Error(
      "Push rejected by branch protection. Switch .slashmd.json mode to \"workspace\" (Review → PR), or allow pushes to the default branch.",
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}
