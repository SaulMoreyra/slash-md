import * as vscode from "vscode";
import { HostToWebview } from "./protocol";

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
