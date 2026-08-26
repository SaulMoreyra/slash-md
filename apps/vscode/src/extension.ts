import * as vscode from "vscode";
import { SlashMdEditorProvider } from "./editor/editorProvider";
import { setGitBinary } from "./editor/git";
import { registerMarkdownAssociation } from "./editor/markdownAssociation";

export function activate(context: vscode.ExtensionContext): void {
  setGitBinary(vscode.workspace.getConfiguration("git").get<string>("path"));
  const provider = new SlashMdEditorProvider(context);
  registerMarkdownAssociation(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(SlashMdEditorProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    }),
  );
}

export function deactivate(): void {}
