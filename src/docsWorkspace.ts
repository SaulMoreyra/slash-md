import * as vscode from "vscode";
import { detectWorkspaceGit } from "./gitDetect";
import { ContentConfig, getContentConfig } from "./github/config";
import { posixNormalize } from "./paths";

const CONTEXT_KEY = "slashMd.isDocsWorkspace";

export async function refreshDocsWorkspaceContext(): Promise<void> {
  const config = getContentConfig();
  if (!config) {
    await vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
    return;
  }
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    if (await folderMatchesContentRepo(folder.uri, config)) {
      await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true);
      return;
    }
  }
  await vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
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

function relativePosix(folder: vscode.Uri, file: vscode.Uri): string | undefined {
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
