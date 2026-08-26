import { reviewThreadTarget } from "@slash-md/core/threadGate";
import { getPull } from "@slash-md/github/api";
import {
  canWriteToRepoRest,
  createLineReviewCommentRest,
  lineForSnippet,
  loadReviewThreadsRest,
  replyToReviewCommentRest,
  setThreadResolvedGraphql,
} from "@slash-md/github/comments";
import type { ThreadsPayload } from "../shared/api";
import { resolveToken } from "./auth";
import { getContentConfig, readText, repoFile } from "./config";
import { getPublicationState } from "./publication";
import { getWorkspaceRoot } from "./session";

function requireRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Abre una carpeta de docs primero.");
  }
  return root;
}

export async function loadThreads(repoPath: string): Promise<ThreadsPayload> {
  const root = requireRoot();
  const config = await getContentConfig(root);
  if (!config || config.mode !== "workspace") {
    return { threads: [], prUrl: null, canWrite: false, headOid: null };
  }
  const markdown = await readText(repoFile(root, repoPath));

  const { publication } = await getPublicationState();
  const target = reviewThreadTarget({
    markdown,
    fileRemotePath: repoPath,
    draftPr: publication?.prNumber,
  });
  if (!target) {
    return { threads: [], prUrl: null, canWrite: false, headOid: null };
  }
  const token = await resolveToken();
  if (!token) {
    return { threads: [], prUrl: null, canWrite: false, headOid: null };
  }
  const [{ threads, prUrl, headOid }, canWrite] = await Promise.all([
    loadReviewThreadsRest({
      token,
      repo: config,
      prNumber: target.prNumber,
      remotePath: target.remotePath,
      fileText: markdown,
    }),
    canWriteToRepoRest(token, config),
  ]);
  return { threads, prUrl, canWrite, headOid };
}

export async function threadReply(repoPath: string, threadId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) {
    return;
  }
  const loaded = await loadThreads(repoPath);
  const thread = loaded.threads.find((item) => item.id === threadId);
  const parentId = thread?.comments.find((comment) => comment.databaseId != null)?.databaseId;
  if (!parentId) {
    throw new Error("Could not find the parent comment to reply to.");
  }
  const root = requireRoot();
  const config = await getContentConfig(root);
  const token = await resolveToken();
  if (!config || !token) {
    throw new Error("Sign in to GitHub to comment.");
  }
  const markdown = await readText(repoFile(root, repoPath));
  const { publication } = await getPublicationState();
  const target = reviewThreadTarget({
    markdown,
    fileRemotePath: repoPath,
    draftPr: publication?.prNumber,
  });
  if (!target) {
    throw new Error("Open a Review (PR) before commenting.");
  }
  await replyToReviewCommentRest({
    token,
    repo: config,
    prNumber: target.prNumber,
    inReplyTo: parentId,
    body: trimmed,
  });
}

export async function threadResolve(repoPath: string, threadId: string, resolved: boolean): Promise<void> {
  const token = await resolveToken();
  if (!token) {
    throw new Error("Sign in to GitHub.");
  }
  await setThreadResolvedGraphql({ token, threadId, resolved });
  void repoPath;
}

export async function threadCreate(repoPath: string, selectedText: string, body: string): Promise<void> {
  const selected = selectedText.trim();
  const trimmedBody = body.trim();
  if (!selected || !trimmedBody) {
    return;
  }
  const root = requireRoot();
  const config = await getContentConfig(root);
  const token = await resolveToken();
  if (!config || !token) {
    throw new Error("Sign in to GitHub to comment.");
  }
  if (config.mode !== "workspace") {
    throw new Error("Comments are available in Workspace mode with an open PR.");
  }
  const markdown = await readText(repoFile(root, repoPath));
  const { publication } = await getPublicationState();
  const target = reviewThreadTarget({
    markdown,
    fileRemotePath: repoPath,
    draftPr: publication?.prNumber,
  });
  if (!target) {
    throw new Error("Open a Review (PR) before commenting.");
  }
  const pr = await getPull(token, config, target.prNumber);
  const commitId = pr.head.sha;
  const lines = lineForSnippet(markdown, selected);
  if (!lines) {
    throw new Error("Could not find that selection in the file. Push latest changes or select text that exists on GitHub.");
  }
  await createLineReviewCommentRest({
    token,
    repo: config,
    prNumber: target.prNumber,
    commitId,
    path: target.remotePath,
    line: lines.line,
    startLine: lines.startLine,
    body: trimmedBody,
  });
}
