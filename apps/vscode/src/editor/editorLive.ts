import * as vscode from "vscode";
import { HostToWebview } from "@slash-md/core/protocol";

const live = new Map<string, vscode.Webview>();

export function trackEditor(uri: vscode.Uri, webview: vscode.Webview): vscode.Disposable {
  const id = uri.toString();
  live.set(id, webview);
  return new vscode.Disposable(() => {
    if (live.get(id) === webview) {
      live.delete(id);
    }
  });
}

export async function notifyEditor(
  uri: vscode.Uri,
  message: HostToWebview,
): Promise<void> {
  await live.get(uri.toString())?.postMessage(message);
}

export function isEditorLive(uri: vscode.Uri): boolean {
  return live.has(uri.toString());
}

export async function notifyEditorWhenReady(
  uri: vscode.Uri,
  message: HostToWebview,
): Promise<void> {
  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  if (!isEditorLive(uri)) {
    await delay(450);
  }
  if (isEditorLive(uri)) {
    await notifyEditor(uri, message);
    return;
  }
  await delay(450);
  await notifyEditor(uri, message);
}
