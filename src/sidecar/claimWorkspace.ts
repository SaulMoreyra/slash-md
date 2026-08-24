import * as vscode from "vscode";
import { resolveDocsWorkspaceFile } from "../workspace/docsWorkspace";
import { DraftStore } from "./draftStore";
import { SlashMdEditorProvider } from "../editor/editorProvider";
import { ContentRepo } from "../github/contentRepo";

/**
 * Open a docs-workspace `.md` with Slash MD in place (local-first).
 * Does not copy into the sidecar — the Explorer file is the source of truth.
 */
export async function editWorkspaceFile(
  _context: vscode.ExtensionContext,
  _store: DraftStore,
  _repos: ContentRepo,
  _draftsTree: { refresh(): void },
  _docsTree: { refresh(): void },
  uri?: vscode.Uri,
): Promise<void> {
  const target = uri ?? activeMarkdownUri();
  if (!target) {
    await vscode.window.showWarningMessage(
      "Open the documentation repo or use Slash MD: Open from GitHub.",
    );
    return;
  }

  const resolved = await resolveDocsWorkspaceFile(target);
  if (!resolved) {
    await vscode.window.showWarningMessage(
      "That file is not in the configured documentation repo. Use Open from GitHub or Init.",
    );
    return;
  }

  try {
    await vscode.commands.executeCommand("vscode.openWith", target, SlashMdEditorProvider.viewType);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await vscode.window.showErrorMessage(`Could not open with Slash MD: ${message}`);
  }
}

function activeMarkdownUri(): vscode.Uri | undefined {
  const editor = vscode.window.activeTextEditor?.document.uri;
  if (editor && editor.path.endsWith(".md") && !editor.path.endsWith(".slash.md")) {
    return editor;
  }
  const open = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (open && typeof open === "object" && "uri" in open) {
    const fromTab = (open as { uri: vscode.Uri }).uri;
    if (fromTab.path.endsWith(".md") && !fromTab.path.endsWith(".slash.md")) {
      return fromTab;
    }
  }
  return undefined;
}
