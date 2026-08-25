import * as vscode from "vscode";
import { SlashMdEditorProvider } from "../editor/editorProvider";
import { notifyEditorWhenReady } from "../editor/editorLive";
import { getContentConfig } from "../github/config";
import { docsLibraryRoot } from "./docsWorkspace";

/**
 * Handles `vscode://saulmoreyra.slash-md/open?path=docs/foo.md` deep links.
 *
 * Optional query params:
 *   snippet — text to scroll to / highlight (revealThread message)
 *   threadId — PR thread id to reveal alongside snippet
 */
export class SlashMdUriHandler implements vscode.UriHandler {
  async handleUri(uri: vscode.Uri): Promise<void> {
    if (uri.path !== "/open") {
      return;
    }

    const params = new URLSearchParams(uri.query);
    const docPath = params.get("path");
    if (!docPath) {
      await vscode.window.showWarningMessage("Slash MD deep link missing ?path= parameter.");
      return;
    }

    const fileUri = await resolveDocUri(docPath);
    if (!fileUri) {
      await vscode.window.showWarningMessage(
        `Could not locate "${docPath}" in the docs workspace.`,
      );
      return;
    }

    await vscode.commands.executeCommand(
      "vscode.openWith",
      fileUri,
      SlashMdEditorProvider.viewType,
    );

    const snippet = params.get("snippet");
    if (snippet) {
      await notifyEditorWhenReady(fileUri, {
        type: "revealThread",
        snippet,
        threadId: params.get("threadId") ?? undefined,
      });
    }
  }
}

async function resolveDocUri(docPath: string): Promise<vscode.Uri | undefined> {
  const config = getContentConfig();
  if (config) {
    const root = await docsLibraryRoot(config);
    if (root) {
      const candidate = vscode.Uri.joinPath(root, docPath);
      if (await fileExists(candidate)) {
        return candidate;
      }
    }
  }

  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    const candidate = vscode.Uri.joinPath(folder.uri, docPath);
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.File) !== 0;
  } catch {
    return false;
  }
}
