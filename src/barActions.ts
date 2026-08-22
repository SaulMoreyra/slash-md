import * as vscode from "vscode";
import { draftBarState } from "./barState";
import { clearDraftMeta } from "./draftLookup";
import { getDraftMeta, patchDraftMeta } from "./draftMeta";
import { DraftStore } from "./draftStore";
import { stampDocMeta } from "./docMeta";
import { getGithubSession } from "./github/auth";
import { getContentConfig } from "./github/config";
import { ContentRepo } from "./github/contentRepo";
import { PublishBlocked, publishPull } from "./github/publish";
import { pushDirect } from "./github/pushDirect";
import { submitReview } from "./github/review";
import { markdownHash } from "./hash";
import { runInit } from "./init";
import { HostToWebview } from "./messaging";
import { splitFrontmatter } from "./frontmatter";

export async function handleReview(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  webview: vscode.Webview,
  markdown: string,
): Promise<void> {
  const config = await resolveConfig(context);
  if (!config) {
    await sendUnconfigured(context, document, webview);
    return;
  }

  if (config.mode === "personal") {
    await vscode.window.showInformationMessage("Personal mode uses Publish only (no PR).");
    return;
  }

  const session = await getGithubSession();
  if (!session) {
    await patchDraftMeta(context, document.uri, { kind: "error", label: "no GitHub session" });
    await webview.postMessage({
      type: "status",
      kind: "error",
      label: "no GitHub session",
      publishEnabled: false,
      repoMode: config.mode,
    } satisfies HostToWebview);
    await vscode.window.showWarningMessage("Sign in to GitHub to run Review.");
    return;
  }

  const meta = getDraftMeta(context, document.uri);
  const pendingDelete = Boolean(meta.pendingDelete);

  let stamped = markdown;
  if (!pendingDelete) {
    stamped = stampDocMeta(markdown, {
      status: "review",
      owner: session.account.label,
      touchUpdated: true,
    });
    await writeDraft(document, stamped);
    await webview.postMessage({ type: "frontmatter", fields: splitFrontmatter(stamped).fields } satisfies HostToWebview);
  }

  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Slash MD" },
      async (progress) => {
        progress.report({ message: pendingDelete ? "Opening review (delete)…" : "Opening review…" });
        const repos = new ContentRepo(context);
        const result = await submitReview({
          context,
          repos,
          config,
          session,
          document,
          markdown: stamped,
        });
        await patchDraftMeta(context, document.uri, {
          prNumber: result.pr.number,
          prUrl: result.pr.html_url,
          reviewBranch: result.branch,
          remotePath: result.remotePath,
          sourcePath: result.remotePath,
          remoteHash: pendingDelete ? meta.remoteHash : markdownHash(stamped),
          remoteOid: result.headOid,
          kind: "in_review",
          label: pendingDelete ? `delete · ${result.label}` : result.label,
          published: false,
          pendingDelete,
        });
        const status: HostToWebview = {
          type: "status",
          kind: "in_review",
          label: pendingDelete ? `delete · ${result.label}` : result.label,
          publishEnabled: true,
          prUrl: result.pr.html_url,
          path: result.remotePath,
          repoMode: config.mode,
        };
        await webview.postMessage(status);
        if (result.created) {
          await vscode.env.openExternal(vscode.Uri.parse(result.pr.html_url));
        }
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showErrorMessage(`Review failed: ${message}`);
    const label = /auth|401|403|sesión|session/i.test(message)
      ? "no GitHub session"
      : /network|enotfound|offline/i.test(message)
        ? "offline"
        : "review failed";
    await patchDraftMeta(context, document.uri, { kind: "error", label });
    const status: HostToWebview = {
      type: "status",
      kind: "error",
      label,
      publishEnabled: false,
      repoMode: config.mode,
    };
    await webview.postMessage(status);
  }
}

async function resolveConfig(context: vscode.ExtensionContext) {
  const existing = getContentConfig();
  if (existing) {
    return existing;
  }
  const choice = await vscode.window.showWarningMessage(
    "Repo not configured. Init saves config to .slashmd.json in the workspace.",
    { modal: true },
    "Init",
  );
  if (choice !== "Init") {
    return undefined;
  }
  const ok = await runInit(context);
  return ok ? getContentConfig() : undefined;
}

async function sendUnconfigured(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  webview: vscode.Webview,
): Promise<void> {
  const status: HostToWebview = {
    type: "status",
    kind: "error",
    label: "repo not configured",
    publishEnabled: false,
  };
  await patchDraftMeta(context, document.uri, { kind: "error", label: status.label });
  await webview.postMessage(status);
}

export async function handlePublish(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  webview: vscode.Webview,
  markdown: string,
): Promise<void> {
  const config = await resolveConfig(context);
  if (!config) {
    await sendUnconfigured(context, document, webview);
    return;
  }

  if (config.mode === "personal") {
    await handlePersonalPublish(context, document, webview, markdown, config);
    return;
  }

  await handleWorkspacePublish(context, document, webview, markdown, config);
}

async function handlePersonalPublish(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  webview: vscode.Webview,
  markdown: string,
  config: NonNullable<ReturnType<typeof getContentConfig>>,
): Promise<void> {
  const meta = getDraftMeta(context, document.uri);
  const session = await getGithubSession();
  if (!session) {
    await patchDraftMeta(context, document.uri, { kind: "error", label: "no GitHub session" });
    await webview.postMessage({
      type: "status",
      kind: "error",
      label: "no GitHub session",
      publishEnabled: true,
      repoMode: "personal",
    } satisfies HostToWebview);
    await vscode.window.showWarningMessage("Sign in to GitHub to Publish.");
    return;
  }

  const pendingDelete = Boolean(meta.pendingDelete);
  let stamped = markdown;
  if (!pendingDelete) {
    stamped = stampDocMeta(markdown, {
      status: "published",
      owner: session.account.label,
      touchUpdated: true,
    });
    await writeDraft(document, stamped);
    await webview.postMessage({ type: "frontmatter", fields: splitFrontmatter(stamped).fields } satisfies HostToWebview);
  }

  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Slash MD" },
      async (progress) => {
        progress.report({ message: pendingDelete ? "Deleting on GitHub…" : "Publishing…" });
        const repos = new ContentRepo(context);
        const result = await pushDirect({
          context,
          repos,
          config,
          session,
          document,
          markdown: stamped,
        });
        if (pendingDelete) {
          const store = new DraftStore(context);
          await store.deleteDraft(document.uri);
          await clearDraftMeta(context, document.uri);
          await webview.postMessage({
            type: "status",
            kind: "published",
            label: "deleted",
            publishEnabled: false,
            prUrl: result.publishedUrl,
            path: result.remotePath,
            repoMode: "personal",
          } satisfies HostToWebview);
          await vscode.window.showInformationMessage(`Deleted on GitHub: ${result.remotePath}`);
          return;
        }
        await patchDraftMeta(context, document.uri, {
          kind: "published",
          label: result.label,
          published: true,
          publishedUrl: result.publishedUrl,
          remotePath: result.remotePath,
          sourcePath: result.remotePath,
          remoteHash: markdownHash(stamped),
          remoteOid: result.headOid,
          pendingDelete: false,
          prNumber: undefined,
          prUrl: undefined,
          reviewBranch: undefined,
        });
        await webview.postMessage({
          type: "status",
          kind: "published",
          label: result.label,
          publishEnabled: false,
          prUrl: result.publishedUrl,
          path: result.remotePath,
          repoMode: "personal",
        } satisfies HostToWebview);
      },
    );
  } catch (err) {
    await showPublishError(err, webview, undefined, "personal");
  }
}

async function handleWorkspacePublish(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  webview: vscode.Webview,
  markdown: string,
  config: NonNullable<ReturnType<typeof getContentConfig>>,
): Promise<void> {
  const meta = getDraftMeta(context, document.uri);
  if (!meta.prNumber) {
    await vscode.window.showWarningMessage("Publish is disabled until there is an open PR.", {
      modal: true,
    });
    const status = draftBarState(meta, markdown, { mode: "workspace" });
    await webview.postMessage({
      type: "status",
      kind: status.kind,
      label: status.label || "no PR",
      publishEnabled: false,
      prUrl: status.prUrl,
      repoMode: "workspace",
    } satisfies HostToWebview);
    return;
  }

  const session = await getGithubSession();
  if (!session) {
    await patchDraftMeta(context, document.uri, { kind: "error", label: "no GitHub session" });
    await webview.postMessage({
      type: "status",
      kind: "error",
      label: "no GitHub session",
      publishEnabled: Boolean(meta.prNumber),
      prUrl: meta.prUrl,
      repoMode: "workspace",
    } satisfies HostToWebview);
    await vscode.window.showWarningMessage("Sign in to GitHub to Publish.");
    return;
  }

  const auth = session;
  const token = auth.accessToken;
  const resolved = config;
  const pendingDelete = Boolean(meta.pendingDelete);

  let stamped = markdown;
  if (!pendingDelete) {
    stamped = stampDocMeta(markdown, {
      status: "published",
      owner: auth.account.label,
      touchUpdated: true,
    });
    await writeDraft(document, stamped);
    await webview.postMessage({ type: "frontmatter", fields: splitFrontmatter(stamped).fields } satisfies HostToWebview);
  }

  try {
    await runPublish(false);
  } catch (err) {
    if (isPublishBlocked(err)) {
      const label = err instanceof Error ? err.message : "needs approval";
      await patchDraftMeta(context, document.uri, { kind: "in_review", label, pendingDelete });
      await webview.postMessage({
        type: "status",
        kind: "in_review",
        label,
        publishEnabled: true,
        prUrl: meta.prUrl,
        repoMode: "workspace",
      } satisfies HostToWebview);
      const choice = await vscode.window.showWarningMessage(
        `Heads up: ${label}. Publish anyway?`,
        { modal: true },
        "Publish anyway",
      );
      if (choice === "Publish anyway") {
        try {
          await runPublish(true);
        } catch (forced) {
          await showPublishError(forced, webview, meta.prUrl, "workspace");
        }
      }
      return;
    }
    await showPublishError(err, webview, meta.prUrl, "workspace");
  }

  async function runPublish(force: boolean): Promise<void> {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Slash MD" },
      async (progress) => {
        progress.report({ message: pendingDelete ? "Deleting on GitHub…" : "Publishing…" });
        const repos = new ContentRepo(context);
        // Push stamped frontmatter (or deletion) to the review branch before merge.
        await submitReview({
          context,
          repos,
          config: resolved,
          session: auth,
          document,
          markdown: stamped,
        });
        const result = await publishPull({
          token,
          config: resolved,
          prNumber: meta.prNumber!,
          markdown: stamped,
          remotePath: meta.remotePath,
          force,
        });
        if (pendingDelete) {
          const store = new DraftStore(context);
          await store.deleteDraft(document.uri);
          await clearDraftMeta(context, document.uri);
          await webview.postMessage({
            type: "status",
            kind: "published",
            label: "deleted",
            publishEnabled: false,
            prUrl: result.publishedUrl,
            path: meta.remotePath,
            repoMode: "workspace",
          } satisfies HostToWebview);
          await vscode.window.showInformationMessage(`Deleted on GitHub: ${meta.remotePath ?? ""}`);
          return;
        }
        await patchDraftMeta(context, document.uri, {
          kind: "published",
          label: result.label,
          published: true,
          publishedUrl: result.publishedUrl,
          remoteHash: markdownHash(stamped),
          pendingDelete: false,
        });
        await webview.postMessage({
          type: "status",
          kind: "published",
          label: result.label,
          publishEnabled: false,
          prUrl: result.publishedUrl,
          path: meta.remotePath,
          repoMode: "workspace",
        } satisfies HostToWebview);
      },
    );
    if (meta.reviewBranch) {
      const repos = new ContentRepo(context);
      void repos.removeReviewWorktree(resolved, meta.reviewBranch);
    }
  }
}

async function writeDraft(document: vscode.TextDocument, text: string): Promise<void> {
  const onDisk = Buffer.from(await vscode.workspace.fs.readFile(document.uri)).toString("utf8");
  if (onDisk === text) {
    return;
  }
  await vscode.workspace.fs.writeFile(document.uri, Buffer.from(text, "utf8"));
}

async function showPublishError(
  err: unknown,
  webview: vscode.Webview,
  prUrl?: string,
  repoMode?: "workspace" | "personal",
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const label = shortBarError(message);
  await vscode.window.showErrorMessage(`Publish failed: ${message}`);
  await webview.postMessage({
    type: "status",
    kind: "error",
    label,
    publishEnabled: true,
    prUrl,
    repoMode,
  } satisfies HostToWebview);
}

function shortBarError(message: string): string {
  const lower = message.toLowerCase();
  if (/conflict|not mergeable|merge conflict/i.test(lower)) {
    return "conflict";
  }
  if (/approv|review required|protected branch/i.test(lower)) {
    return "needs approval";
  }
  if (/branch protection|not allowed to push/i.test(lower)) {
    return "push rejected by branch protection";
  }
  if (/check|status|ci |workflow/i.test(lower)) {
    return "checks failing";
  }
  if (/auth|401|403|permission|sesión|session/i.test(lower)) {
    return "no GitHub session";
  }
  if (/network|enotfound|offline|fetch failed/i.test(lower)) {
    return "offline";
  }
  if (message.length <= 40) {
    return message;
  }
  return `${message.slice(0, 37)}…`;
}

function isPublishBlocked(err: unknown): boolean {
  return err instanceof PublishBlocked || (err instanceof Error && err.name === "PublishBlocked");
}

export async function handleOpenUrl(url: string): Promise<void> {
  let parsed: vscode.Uri;
  try {
    parsed = vscode.Uri.parse(url);
  } catch {
    return;
  }
  if (parsed.scheme !== "https" || parsed.authority !== "github.com") {
    return;
  }
  await vscode.env.openExternal(parsed);
}
