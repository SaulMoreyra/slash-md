import * as vscode from "vscode";
import { detectWorkspaceGit } from "../config/gitDetect";
import { ContentConfig, getContentConfig } from "../github/config";
import { posixNormalize } from "../domain/paths";
import { SLASHMD_FILENAME } from "../config/slashmdConfig";

const CONTEXT_KEY = "slashMd.isDocsWorkspace";

export async function refreshDocsWorkspaceContext(): Promise<boolean> {
  const folders = vscode.workspace.workspaceFolders ?? [];

  for (const folder of folders) {
    if (await folderHasSlashmdJson(folder.uri)) {
      await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true);
      return true;
    }
  }

  const config = getContentConfig();
  if (!config) {
    await vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
    return false;
  }

  for (const folder of folders) {
    if (await folderMatchesContentRepo(folder.uri, config)) {
      await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true);
      return true;
    }
  }

  await vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
  return false;
}

export function watchDocsWorkspaceContext(disposables: vscode.Disposable[]): void {
  void refreshDocsWorkspaceContext();
  disposables.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void refreshDocsWorkspaceContext();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("slash-md")) {
        void refreshDocsWorkspaceContext();
      }
    }),
  );
}

export async function folderMatchesContentRepo(folder: vscode.Uri, config: ContentConfig): Promise<boolean> {
  const detected = await detectWorkspaceGit(folder);
  return Boolean(detected.repo && equalsRepo(detected.repo, config.repo));
}

export async function folderHasSlashmdJson(folder: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder, SLASHMD_FILENAME));
    return (stat.type & vscode.FileType.File) !== 0;
  } catch {
    return false;
  }
}

export async function folderHasContentPath(folder: vscode.Uri, contentPath: string): Promise<boolean> {
  const parts = contentPath.split("/").filter(Boolean);
  if (parts.length === 0) {
    return true;
  }
  try {
    const stat = await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder, ...parts));
    return (stat.type & vscode.FileType.Directory) !== 0;
  } catch {
    return false;
  }
}

/** New page: `.slashmd.json`, then contentRepo remote, then the first workspace folder. */
export async function resolveCreateWorkspaceRoot(): Promise<vscode.Uri | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    return undefined;
  }
  for (const folder of folders) {
    if (await folderHasSlashmdJson(folder.uri)) {
      return folder.uri;
    }
  }
  const config = getContentConfig();
  if (config) {
    for (const folder of folders) {
      if (await folderMatchesContentRepo(folder.uri, config)) {
        return folder.uri;
      }
    }
  }
  return folders[0].uri;
}

/** First workspace folder that is the docs library (`.slashmd.json`, remote, or contentPath on disk). */
export async function docsLibraryRoot(config: ContentConfig): Promise<vscode.Uri | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    if (await folderHasSlashmdJson(folder.uri)) {
      return folder.uri;
    }
  }
  for (const folder of folders) {
    if (await folderMatchesContentRepo(folder.uri, config)) {
      return folder.uri;
    }
  }
  for (const folder of folders) {
    if (await folderHasContentPath(folder.uri, config.contentPath)) {
      return folder.uri;
    }
  }
  return undefined;
}

/** Posix path of a wiki `.md` under the docs library `contentPath`, or undefined. */
export async function docsContentRemotePath(
  uri: vscode.Uri,
  config: ContentConfig,
): Promise<string | undefined> {
  const root = await docsLibraryRoot(config);
  if (!root) {
    return undefined;
  }
  const remotePath = relativePosix(root, uri);
  if (!remotePath || !isDocsMarkdownPath(config, remotePath)) {
    return undefined;
  }
  return remotePath;
}

export async function resolveDocsWorkspaceFile(
  uri: vscode.Uri,
): Promise<{ config: ContentConfig; folder: vscode.Uri; remotePath: string } | undefined> {
  const config = getContentConfig();
  if (!config) {
    return undefined;
  }
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return undefined;
  }
  if (!(await folderMatchesContentRepo(folder.uri, config))) {
    return undefined;
  }
  const remotePath = relativePosix(folder.uri, uri);
  if (!remotePath || !isDocsMarkdownPath(config, remotePath)) {
    return undefined;
  }
  return { config, folder: folder.uri, remotePath };
}

export function isDocsMarkdownPath(config: ContentConfig, remotePath: string): boolean {
  const normalized = posixNormalize(remotePath);
  if (!normalized.endsWith(".md") || normalized.endsWith(".slash.md")) {
    return false;
  }
  const root = config.contentPath;
  if (!root) {
    return true;
  }
  return normalized === root || normalized.startsWith(`${root}/`);
}

export function relativePosix(folder: vscode.Uri, file: vscode.Uri): string | undefined {
  const base = folder.fsPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const full = file.fsPath.replace(/\\/g, "/");
  if (full === base) {
    return undefined;
  }
  const prefix = `${base}/`;
  if (!full.startsWith(prefix) && !full.toLowerCase().startsWith(prefix.toLowerCase())) {
    return undefined;
  }
  return posixNormalize(full.slice(prefix.length));
}

function equalsRepo(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
