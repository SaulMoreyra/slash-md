import * as vscode from "vscode";
import { SlashMdEditorProvider } from "./editorProvider";

const SETTING_KEY = "useAsDefaultMarkdown";
const SECTION = "slash-md";
const MD_GLOB = "*.md";

export function registerMarkdownAssociation(context: vscode.ExtensionContext): void {
  void syncAssociationFromSetting();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`${SECTION}.${SETTING_KEY}`)) {
        void syncAssociationFromSetting();
      }
    }),
    vscode.commands.registerCommand("slash-md.useAsDefaultMarkdown", async () => {
      await setUseAsDefault(true);
      await vscode.window.showInformationMessage(
        "Slash MD will open Markdown files by default. You can turn this off in Settings or with “Stop using as default Markdown editor”.",
      );
    }),
    vscode.commands.registerCommand("slash-md.stopUsingAsDefaultMarkdown", async () => {
      await setUseAsDefault(false);
      await vscode.window.showInformationMessage("Slash MD is no longer the default Markdown editor.");
    }),
    vscode.commands.registerCommand("slash-md.openMarkdown", async (uri?: vscode.Uri) => {
      const target = uri ?? activeMarkdownUri();
      if (!target) {
        await vscode.window.showWarningMessage("Open a .md file to edit it with Slash MD.");
        return;
      }
      await vscode.commands.executeCommand("vscode.openWith", target, SlashMdEditorProvider.viewType);
    }),
  );
}

export function isUseAsDefaultMarkdown(): boolean {
  return vscode.workspace.getConfiguration(SECTION).get<boolean>(SETTING_KEY) === true;
}

async function setUseAsDefault(enabled: boolean): Promise<void> {
  await vscode.workspace
    .getConfiguration(SECTION)
    .update(SETTING_KEY, enabled, vscode.ConfigurationTarget.Global);
  await applyEditorAssociation(enabled);
}

async function syncAssociationFromSetting(): Promise<void> {
  await applyEditorAssociation(isUseAsDefaultMarkdown());
}

async function applyEditorAssociation(enabled: boolean): Promise<void> {
  const config = vscode.workspace.getConfiguration("workbench");
  const current = { ...(config.get<Record<string, string>>("editorAssociations") ?? {}) };
  const existing = current[MD_GLOB];

  if (enabled) {
    if (existing === SlashMdEditorProvider.viewType) {
      return;
    }
    current[MD_GLOB] = SlashMdEditorProvider.viewType;
    await config.update("editorAssociations", current, vscode.ConfigurationTarget.Global);
    return;
  }

  if (existing !== SlashMdEditorProvider.viewType) {
    return;
  }
  delete current[MD_GLOB];
  await config.update("editorAssociations", current, vscode.ConfigurationTarget.Global);
}

function activeMarkdownUri(): vscode.Uri | undefined {
  const editor = vscode.window.activeTextEditor?.document.uri;
  if (editor && isMarkdown(editor)) {
    return editor;
  }
  const open = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (open && typeof open === "object" && "uri" in open) {
    const fromTab = (open as { uri: vscode.Uri }).uri;
    if (isMarkdown(fromTab)) {
      return fromTab;
    }
  }
  return undefined;
}

function isMarkdown(uri: vscode.Uri): boolean {
  return uri.path.endsWith(".md");
}
