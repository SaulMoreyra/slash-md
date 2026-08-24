import * as vscode from "vscode";
import { getDraftMeta } from "./draftMeta";
import { DraftStore } from "./draftStore";

function key(uri: vscode.Uri): string {
  return `draftMeta:${uri.toString()}`;
}

export async function clearDraftMeta(context: vscode.ExtensionContext, uri: vscode.Uri): Promise<void> {
  await context.globalState.update(key(uri), undefined);
}

export async function findDraftByRemotePath(
  context: vscode.ExtensionContext,
  store: DraftStore,
  remotePath: string,
): Promise<vscode.Uri | undefined> {
  for (const uri of await store.listDrafts()) {
    const meta = getDraftMeta(context, uri);
    if (meta.remotePath === remotePath || meta.sourcePath === remotePath) {
      return uri;
    }
  }
  return undefined;
}
