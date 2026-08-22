import * as vscode from "vscode";
import { getDraftMeta, patchDraftMeta } from "./draftMeta";
import { getGithubSession } from "./github/auth";
import { getContentConfig } from "./github/config";
import { ContentRepo } from "./github/contentRepo";
import { markdownHash } from "./hash";
import { submitReview } from "./github/review";
import {
  canWriteToRepo,
  createLineReviewComment,
  lineForSelection,
  loadReviewThreads,
  replyToReviewComment,
  setThreadResolved,
} from "./github/threads";
import { HostToWebview } from "./messaging";

export async function handleThreadReply(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  webview: vscode.Webview,
  repos: ContentRepo,
  threadId: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) {
    return;
  }
  const gate = await openPrGate(context, document);
  if (!gate) {
    return;
  }
  const { config, meta, session } = gate;
  const loaded = await loadReviewThreads({
    token: session.accessToken,
    config,
    repos,
    prNumber: meta.prNumber!,
    remotePath: meta.remotePath!,
  });
  const thread = loaded.threads.find((t) => t.id === threadId);
  const parentId = thread?.comments.find((c) => c.databaseId != null)?.databaseId;
  if (!parentId) {
    await vscode.window.showWarningMessage("Could not find the parent comment to reply to.");
    return;
  }
  try {
    await replyToReviewComment({
      token: session.accessToken,
      config,
      prNumber: meta.prNumber!,
      inReplyTo: parentId,
      body: trimmed,
    });
    await pushThreads(context, document, webview, repos);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showErrorMessage(`Reply failed: ${message}`);
  }
}

export async function handleThreadResolve(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  webview: vscode.Webview,
  repos: ContentRepo,
  threadId: string,
  resolved: boolean,
): Promise<void> {
  const gate = await openPrGate(context, document);
  if (!gate) {
    return;
  }
  try {
    await setThreadResolved({
      token: gate.session.accessToken,
      threadId,
      resolved,
    });
    await pushThreads(context, document, webview, repos);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showErrorMessage(`Could not update thread: ${message}`);
  }
}

export async function handleThreadCreate(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  webview: vscode.Webview,
  repos: ContentRepo,
  markdown: string,
  selectedText: string,
): Promise<void> {
  const selected = selectedText.trim();
  if (!selected) {
    return;
  }
  const gate = await openPrGate(context, document);
  if (!gate) {
    return;
  }
  const body = await vscode.window.showInputBox({
    title: "Comment on selection",
    prompt: "Add a review comment for the selected text",
    placeHolder: "Your comment",
    ignoreFocusOut: true,
  });
  const trimmedBody = body?.trim() ?? "";
  if (!trimmedBody) {
    return;
  }
  const { config, meta, session } = gate;

  const localHash = markdownHash(markdown);
  const ahead = Boolean(meta.remoteHash && localHash !== meta.remoteHash);
  if (ahead || !meta.remoteOid) {
    const choice = await vscode.window.showWarningMessage(
      "Commenting requires the selection on the review branch. Slash MD will push your draft to the PR first.",
      { modal: true },
      "Push and comment",
    );
    if (choice !== "Push and comment") {
      return;
    }
    try {
      const result = await submitReview({
        context,
        repos,
        config,
        session,
        document,
        markdown,
      });
      await patchDraftMeta(context, document.uri, {
        prNumber: result.pr.number,
        prUrl: result.pr.html_url,
        reviewBranch: result.branch,
        remotePath: result.remotePath,
        sourcePath: result.remotePath,
        remoteHash: markdownHash(markdown),
        remoteOid: result.headOid,
        kind: "in_review",
        label: result.label,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await vscode.window.showErrorMessage(`Could not push for comment: ${message}`);
      return;
    }
  }

  const fresh = getDraftMeta(context, document.uri);
  const commitId = fresh.remoteOid;
  const path = fresh.remotePath;
  if (!commitId || !path || !fresh.prNumber) {
    await vscode.window.showWarningMessage("Missing PR commit to attach the comment.");
    return;
  }

  const lines = await lineForSelection({
    repos,
    config,
    commitOid: commitId,
    path,
    selectedText: selected,
  });
  if (!lines) {
    await vscode.window.showWarningMessage(
      "Could not find that selection in the PR file. Push latest changes or select text that exists on GitHub.",
    );
    return;
  }

  try {
    await createLineReviewComment({
      token: session.accessToken,
      config,
      prNumber: fresh.prNumber,
      commitId,
      path,
      line: lines.line,
      startLine: lines.startLine,
      body: trimmedBody,
    });
    await pushThreads(context, document, webview, repos);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showErrorMessage(`Comment failed: ${message}`);
  }
}

export async function pushThreads(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  webview: vscode.Webview,
  repos: ContentRepo,
): Promise<void> {
  const config = getContentConfig();
  if (!config || config.mode === "personal") {
    await webview.postMessage({ type: "threads", threads: [], canWrite: false } satisfies HostToWebview);
    return;
  }
  const meta = getDraftMeta(context, document.uri);
  if (!meta.prNumber || !meta.remotePath) {
    await webview.postMessage({ type: "threads", threads: [], canWrite: false } satisfies HostToWebview);
    return;
  }
  let session: vscode.AuthenticationSession | undefined;
  try {
    session = await vscode.authentication.getSession("github", ["repo"], { silent: true });
  } catch {
    session = undefined;
  }
  if (!session) {
    return;
  }
  try {
    const [{ threads, prUrl, headOid }, canWrite] = await Promise.all([
      loadReviewThreads({
        token: session.accessToken,
        config,
        repos,
        prNumber: meta.prNumber,
        remotePath: meta.remotePath,
      }),
      canWriteToRepo(session.accessToken, config),
    ]);
    await patchDraftMeta(context, document.uri, { remoteOid: headOid });
    await webview.postMessage({
      type: "threads",
      threads,
      prUrl,
      canWrite,
    } satisfies HostToWebview);
  } catch {
    // Keep last paint on poll errors.
  }
}

async function openPrGate(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
): Promise<
  | {
      config: NonNullable<ReturnType<typeof getContentConfig>>;
      meta: ReturnType<typeof getDraftMeta>;
      session: vscode.AuthenticationSession;
    }
  | undefined
> {
  const config = getContentConfig();
  if (!config || config.mode === "personal") {
    await vscode.window.showInformationMessage("Comments are available in Workspace mode with an open PR.");
    return undefined;
  }
  const meta = getDraftMeta(context, document.uri);
  if (!meta.prNumber || !meta.remotePath) {
    await vscode.window.showWarningMessage("Open a Review (PR) before commenting.");
    return undefined;
  }
  const session = await getGithubSession();
  if (!session) {
    await vscode.window.showWarningMessage("Sign in to GitHub to comment.");
    return undefined;
  }
  return { config, meta, session };
}
