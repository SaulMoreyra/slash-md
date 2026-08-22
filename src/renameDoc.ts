import * as vscode from "vscode";
import { clearDraftMeta, findDraftByRemotePath } from "./draftLookup";
import { getDraftMeta, patchDraftMeta } from "./draftMeta";
import { DraftStore } from "./draftStore";
import { docsWorkspaceRoot } from "./homeTree";
import { getContentConfig } from "./github/config";
import { ContentRepo } from "./github/contentRepo";
import { assertSafeRepoPath } from "./github/review";
import { displayTitle } from "./messaging";
import { resolveContentConfig, upsertDraft } from "./openFromGithub";
import { pickMoveTarget } from "./sections";
import { draftBarState } from "./barState";
import { notifyEditor } from "./editorLive";
import { rewriteLinksForMove } from "./links";
import { markdownHash } from "./hash";

export async function renameCurrentDoc(
  context: vscode.ExtensionContext,
  repos: ContentRepo,
  uri?: vscode.Uri,
  docsTree?: { refresh(): void },
): Promise<void> {
  const target = await resolveDraftUri(context, uri);
  if (!target) {
    await vscode.window.showWarningMessage("Open a Slash MD draft to move it.");
    return;
  }
  await renameDraftUri(context, repos, target, docsTree);
}

export async function renameByRemotePath(
  context: vscode.ExtensionContext,
  store: DraftStore,
  repos: ContentRepo,
  remotePath: string,
  docsTree?: { refresh(): void },
): Promise<void> {
  const draft = await ensureDraftForPath(context, store, repos, remotePath);
  if (!draft) {
    return;
  }
  await renameDraftUri(context, repos, draft, docsTree);
}

async function renameDraftUri(
  context: vscode.ExtensionContext,
  repos: ContentRepo,
  target: vscode.Uri,
  docsTree?: { refresh(): void },
): Promise<void> {
  const config = getContentConfig() ?? (await resolveContentConfig(context));
  if (!config) {
    return;
  }

  const meta = getDraftMeta(context, target);
  if (meta.pendingDelete) {
    await vscode.window.showWarningMessage("This draft is marked for deletion. Cancel the deletion before renaming.");
    return;
  }
  const current = meta.remotePath ?? `${config.contentPath}/untitled.md`;
  const picked = await pickMoveTarget(repos, config.contentPath, current);
  if (!picked) {
    return;
  }

  let nextPath: string;
  try {
    nextPath = assertSafeRepoPath(config, picked);
  } catch (err) {
    await vscode.window.showErrorMessage(err instanceof Error ? err.message : "Invalid path");
    return;
  }

  const text = Buffer.from(await vscode.workspace.fs.readFile(target)).toString("utf8");
  const moved = meta.remotePath ? rewriteLinksForMove(text, meta.remotePath, nextPath) : text;
  if (moved !== text) {
    await vscode.workspace.fs.writeFile(target, Buffer.from(moved, "utf8"));
  }
  await patchDraftMeta(context, target, {
    remotePath: nextPath,
    sourcePath: meta.sourcePath ?? meta.remotePath,
    pendingDelete: false,
  });
  const status = draftBarState({ ...meta, remotePath: nextPath }, moved, {
    mode: getContentConfig()?.mode ?? "workspace",
  });
  await notifyEditor(target, {
    type: "status",
    kind: status.kind,
    label: status.label,
    publishEnabled: status.publishEnabled,
    prUrl: status.prUrl,
    path: nextPath,
    repoMode: getContentConfig()?.mode ?? "workspace",
  });
  docsTree?.refresh();
  await vscode.window.showInformationMessage(`Path: ${nextPath}`);
}

export async function deleteCurrentDoc(
  context: vscode.ExtensionContext,
  store: DraftStore,
  uri?: vscode.Uri,
  docsTree?: { refresh(): void },
): Promise<void> {
  const target = await resolveDraftUri(context, uri);
  if (!target) {
    await vscode.window.showWarningMessage("Open a Slash MD draft to delete it.");
    return;
  }
  await deleteDraftUri(context, store, target, docsTree);
}

export async function deleteByRemotePath(
  context: vscode.ExtensionContext,
  store: DraftStore,
  repos: ContentRepo,
  remotePath: string,
  docsTree?: { refresh(): void },
): Promise<void> {
  const draft = await ensureDraftForPath(context, store, repos, remotePath);
  if (!draft) {
    return;
  }
  await deleteDraftUri(context, store, draft, docsTree);
}

async function deleteDraftUri(
  context: vscode.ExtensionContext,
  store: DraftStore,
  target: vscode.Uri,
  docsTree?: { refresh(): void },
): Promise<void> {
  const meta = getDraftMeta(context, target);
  const text = Buffer.from(await vscode.workspace.fs.readFile(target)).toString("utf8");
  const title = displayTitle(text, target.path.split("/").pop() ?? "doc");
  const path = meta.remotePath || meta.sourcePath;

  if (meta.pendingDelete) {
    const undo = await vscode.window.showWarningMessage(
      `"${title}" is already marked for deletion.`,
      { modal: true },
      "Cancel delete",
    );
    if (undo === "Cancel delete") {
      await patchDraftMeta(context, target, {
        pendingDelete: false,
        kind: "ahead",
        label: "ahead of GitHub",
      });
      const textNow = Buffer.from(await vscode.workspace.fs.readFile(target)).toString("utf8");
      const mode = getContentConfig()?.mode ?? "workspace";
      const status = draftBarState({ ...meta, pendingDelete: false }, textNow, { mode });
      await notifyEditor(target, {
        type: "status",
        kind: status.kind,
        label: status.label,
        publishEnabled: status.publishEnabled,
        prUrl: status.prUrl,
        path: meta.remotePath,
        repoMode: mode,
      });
      docsTree?.refresh();
      await vscode.window.showInformationMessage("Deletion cancelled.");
    }
    return;
  }

  const mode = getContentConfig()?.mode ?? "workspace";
  const confirmHint =
    mode === "personal"
      ? "It will be removed from the repo on the next Publish."
      : "It will be removed from the repo on the next Review.";
  const choice = await vscode.window.showWarningMessage(
    path ? `Delete "${title}" (${path})?\n\n${confirmHint}` : `Delete draft "${title}"?`,
    { modal: true },
    "Delete",
  );
  if (choice !== "Delete") {
    return;
  }

  // Never published / no remote path: drop local draft only.
  if (!path) {
    await store.deleteDraft(target);
    await clearDraftMeta(context, target);
    docsTree?.refresh();
    await vscode.window.showInformationMessage("Draft deleted.");
    return;
  }

  const deleteStatus = draftBarState(
    {
      ...meta,
      pendingDelete: true,
      remotePath: path,
      sourcePath: meta.sourcePath ?? path,
      published: false,
    },
    text,
    { mode },
  );
  await patchDraftMeta(context, target, {
    pendingDelete: true,
    remotePath: path,
    sourcePath: meta.sourcePath ?? path,
    kind: deleteStatus.kind,
    label: deleteStatus.label,
    published: false,
  });
  await notifyEditor(target, {
    type: "status",
    kind: deleteStatus.kind,
    label: deleteStatus.label,
    publishEnabled: deleteStatus.publishEnabled,
    prUrl: deleteStatus.prUrl,
    path,
    repoMode: mode,
  });
  docsTree?.refresh();
  const nextStep = mode === "personal" ? "Publish" : "Review";
  await vscode.window.showInformationMessage(
    `Marked for deletion: ${path}. Use ${nextStep} to confirm on GitHub.`,
  );
}

async function ensureDraftForPath(
  context: vscode.ExtensionContext,
  store: DraftStore,
  repos: ContentRepo,
  remotePath: string,
): Promise<vscode.Uri | undefined> {
  const existing = await findDraftByRemotePath(context, store, remotePath);
  if (existing) {
    return existing;
  }

  const config = getContentConfig() ?? (await resolveContentConfig(context));
  if (!config) {
    return undefined;
  }

  const root = await docsWorkspaceRoot(config);
  let text = "";
  if (root) {
    try {
      const uri = vscode.Uri.joinPath(root, ...remotePath.split("/").filter(Boolean));
      text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    } catch {
      text = "";
    }
  }
  if (!text) {
    try {
      const token = await vscode.authentication.getSession("github", ["repo"], { createIfNone: true });
      if (!token) {
        return undefined;
      }
      await repos.ensureFetched(config, token.accessToken);
      text = await repos.readFile(config, remotePath);
    } catch (err) {
      await vscode.window.showErrorMessage(
        `Could not open ${remotePath}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  const oid = "workspace";
  return upsertDraft(context, store, remotePath, text, oid, { remoteHash: markdownHash(text) });
}

async function resolveDraftUri(
  context: vscode.ExtensionContext,
  uri?: vscode.Uri,
): Promise<vscode.Uri | undefined> {
  if (uri?.path.endsWith(".slash.md")) {
    return uri;
  }
  const editor = vscode.window.activeTextEditor?.document.uri;
  if (editor?.path.endsWith(".slash.md")) {
    return editor;
  }
  const open = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (open && typeof open === "object" && "uri" in open) {
    const fromTab = (open as { uri: vscode.Uri }).uri;
    if (fromTab.path.endsWith(".slash.md")) {
      return fromTab;
    }
  }
  return undefined;
}
