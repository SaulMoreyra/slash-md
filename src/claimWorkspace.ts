import * as vscode from "vscode";
import { resolveDocsWorkspaceFile } from "./docsWorkspace";
import { DraftStore } from "./draftStore";
import { SlashMdEditorProvider } from "./editorProvider";
import { ContentRepo } from "./github/contentRepo";
import { markdownHash } from "./hash";
import { upsertDraft } from "./openFromGithub";

const TOAST_KEY = "slashMd.claimCopyToastShown";

export async function editWorkspaceFile(
  context: vscode.ExtensionContext,
  store: DraftStore,
  repos: ContentRepo,
  draftsTree: { refresh(): void },
  docsTree: { refresh(): void },
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

  const token = await vscode.authentication.getSession("github", ["repo"], { silent: true });
  const { config, remotePath } = resolved;
  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Slash MD" },
      async (progress) => {
        progress.report({ message: `Editing ${remotePath}…` });
        const localText = Buffer.from(await vscode.workspace.fs.readFile(target)).toString("utf8");

        let oid = "workspace";
        let remoteHash = markdownHash(localText);
        if (token?.accessToken) {
          await repos.ensureFetched(config, token.accessToken);
          oid = await repos.headOid(config);
          try {
            const remoteText = await repos.readFile(config, remotePath);
            remoteHash = markdownHash(remoteText);
          } catch {
            remoteHash = markdownHash("");
          }
        }

        const draftUri = await upsertDraft(context, store, remotePath, localText, oid, { remoteHash });
        draftsTree.refresh();
        docsTree.refresh();
        await vscode.commands.executeCommand("vscode.openWith", draftUri, SlashMdEditorProvider.viewType);
        await maybeShowCopyToast(context);
      },
    );
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

async function maybeShowCopyToast(context: vscode.ExtensionContext): Promise<void> {
  if (context.globalState.get<boolean>(TOAST_KEY)) {
    return;
  }
  await context.globalState.update(TOAST_KEY, true);
  await vscode.window.showInformationMessage(
    "Editing a copy. The Explorer file does not change until Publish.",
  );
}
