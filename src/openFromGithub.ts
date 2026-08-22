import * as vscode from "vscode";
import { getDraftMeta, patchDraftMeta } from "./draftMeta";
import { DraftStore } from "./draftStore";
import { SlashMdEditorProvider } from "./editorProvider";
import { getGithubToken } from "./github/auth";
import { ContentConfig, getContentConfig } from "./github/config";
import { ContentRepo } from "./github/contentRepo";
import { markdownHash } from "./hash";
import { runInit } from "./init";
import { draftBarState } from "./barState";

export async function openFromGithub(
  context: vscode.ExtensionContext,
  store: DraftStore,
  repos: ContentRepo,
  draftsTree: { refresh(): void },
  docsTree?: { refresh(): void },
): Promise<void> {
  const config = await resolveContentConfig(context);
  if (!config) {
    return;
  }

  const token = await tokenForGit();
  if (!token) {
    return;
  }

  let files: string[];
  try {
    files = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Slash MD" },
      async (progress) => {
        progress.report({ message: `Reading ${config.repo}…` });
        return repos.listMarkdown(config, token);
      },
    );
  } catch (err) {
    await showGitError(err);
    return;
  }

  if (files.length === 0) {
    await vscode.window.showInformationMessage(
      `No .md files in ${config.contentPath || "/"} of ${config.repo}.`,
    );
    return;
  }

  const picked = await vscode.window.showQuickPick(
    files.map((path) => ({
      label: path,
      description: config.repo,
      path,
    })),
    { placeHolder: "Open from GitHub" },
  );
  if (!picked) {
    return;
  }

  await openRemotePath(context, store, repos, draftsTree, picked.path, docsTree);
}

export async function openRemotePath(
  context: vscode.ExtensionContext,
  store: DraftStore,
  repos: ContentRepo,
  draftsTree: { refresh(): void },
  remotePath: string,
  docsTree?: { refresh(): void },
): Promise<void> {
  const config = await resolveContentConfig(context);
  if (!config) {
    return;
  }
  const token = await tokenForGit();
  if (!token) {
    return;
  }

  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Slash MD" },
      async (progress) => {
        progress.report({ message: `Opening ${remotePath}…` });
        await repos.ensureFetched(config, token);
        const text = await repos.readFile(config, remotePath);
        const oid = await repos.headOid(config);
        const uri = await upsertDraft(context, store, remotePath, text, oid);
        draftsTree.refresh();
        docsTree?.refresh();
        await vscode.commands.executeCommand("vscode.openWith", uri, SlashMdEditorProvider.viewType);
      },
    );
  } catch (err) {
    await showGitError(err);
  }
}

export type UpsertDraftOpts = {
  /** Hash of the published/remote body. Defaults to hash of `text`. */
  remoteHash?: string;
};

export async function resolveContentConfig(
  context: vscode.ExtensionContext,
): Promise<ContentConfig | undefined> {
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
  const next = getContentConfig();
  if (!ok || !next) {
    await vscode.window.showWarningMessage("Repo not configured.");
    return undefined;
  }
  return next;
}

export async function upsertDraft(
  context: vscode.ExtensionContext,
  store: DraftStore,
  remotePath: string,
  text: string,
  oid: string,
  opts?: UpsertDraftOpts,
): Promise<vscode.Uri> {
  const hash = opts?.remoteHash ?? markdownHash(text);
  for (const uri of await store.listDrafts()) {
    const meta = getDraftMeta(context, uri);
    if (meta.remotePath !== remotePath && meta.sourcePath !== remotePath) {
      continue;
    }
    const current = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    const localAhead = Boolean(meta.remoteHash && markdownHash(current) !== meta.remoteHash);
    if (!localAhead) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(text, "utf8"));
    }
    const nextText = localAhead ? current : text;
    await patchDraftMeta(context, uri, {
      remotePath,
      sourcePath: remotePath,
      remoteHash: hash,
      remoteOid: oid,
      ...draftBarState(
        { ...meta, remotePath, sourcePath: remotePath, remoteHash: hash, remoteOid: oid },
        nextText,
        { mode: getContentConfig()?.mode ?? "workspace" },
      ),
    });
    return uri;
  }

  const uri = await store.createDraft(text);
  const status = draftBarState(
    { remotePath, sourcePath: remotePath, remoteHash: hash, remoteOid: oid, kind: "draft", label: "" },
    text,
    { mode: getContentConfig()?.mode ?? "workspace" },
  );
  await patchDraftMeta(context, uri, {
    remotePath,
    sourcePath: remotePath,
    remoteHash: hash,
    remoteOid: oid,
    kind: status.kind,
    label: status.label,
  });
  return uri;
}

async function tokenForGit(): Promise<string | undefined> {
  const token = await getGithubToken();
  if (!token) {
    await vscode.window.showWarningMessage("Sign in to GitHub to open docs.");
  }
  return token;
}

async function showGitError(err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  await vscode.window.showErrorMessage(`Could not open from GitHub: ${message}`);
}
