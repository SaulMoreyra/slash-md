import * as vscode from "vscode";
import { posixNormalize } from "@slash-md/core/paths";

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

export function workspaceDisplayPath(uri: vscode.Uri): string {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder) {
    return vscode.workspace.asRelativePath(uri, false);
  }
  return uri.fsPath || uri.path;
}

export function workspaceRelativeDocPath(uri: vscode.Uri): string | undefined {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return undefined;
  }
  return relativePosix(folder.uri, uri);
}
