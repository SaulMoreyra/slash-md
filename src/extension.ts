import * as vscode from "vscode";
import { editWorkspaceFile } from "./claimWorkspace";
import { DocsTreeProvider } from "./docsTree";
import { refreshDocsWorkspaceContext, watchDocsWorkspaceContext } from "./docsWorkspace";
import { DraftStore } from "./draftStore";
import { DraftsTreeProvider } from "./draftsTree";
import { SlashMdEditorProvider } from "./editorProvider";
import { getContentConfig } from "./github/config";
import { getGithubToken } from "./github/auth";
import { ContentRepo } from "./github/contentRepo";
import { HomePanel } from "./homePanel";
import { runInit } from "./init";
import { LibraryViews } from "./libraryViews";
import { createNewDraft } from "./newDraft";
import { createNewFolder } from "./newFolder";
import { openFromGithub, openRemotePath } from "./openFromGithub";
import { deleteByRemotePath, deleteCurrentDoc, renameByRemotePath, renameCurrentDoc } from "./renameDoc";
import { reloadSlashmdConfig, restoreBoundContentRepo, getBoundContentRepo } from "./slashmdConfig";
import { registerMarkdownAssociation } from "./markdownAssociation";

export function activate(context: vscode.ExtensionContext): void {
  const store = new DraftStore(context);
  const draftsTree = new DraftsTreeProvider(store, context);
  const repos = new ContentRepo(context);
  const docsTree = new DocsTreeProvider(repos, context, store);
  const home = new HomePanel(context, store, repos, draftsTree, docsTree);
  const library = new LibraryViews(draftsTree, docsTree, home);
  const provider = new SlashMdEditorProvider(context, library);

  watchDocsWorkspaceContext(context.subscriptions);
  restoreBoundContentRepo(context);
  void bootstrapConfig(repos);
  registerMarkdownAssociation(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(SlashMdEditorProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    }),
    vscode.window.registerTreeDataProvider("slash-md.drafts", draftsTree),
    vscode.window.registerTreeDataProvider("slash-md.docs", docsTree),
    vscode.commands.registerCommand("slash-md.home", () => home.show()),
    vscode.commands.registerCommand("slash-md.new", async () => {
      await createNewDraft({ context, store, repos, draftsTree, docsTree });
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.newInFolder", async (node?: { path?: string }) => {
      await createNewDraft({ context, store, repos, draftsTree, docsTree, section: node?.path });
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.newFolder", async (node?: { path?: string }) => {
      await createNewFolder({ context, parent: node?.path });
      docsTree.refresh();
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.openDraft", async () => {
      const uri = await store.pickDraft();
      if (!uri) {
        return;
      }
      await vscode.commands.executeCommand("vscode.openWith", uri, SlashMdEditorProvider.viewType);
    }),
    vscode.commands.registerCommand("slash-md.openFromGithub", async () => {
      await openFromGithub(context, store, repos, draftsTree, docsTree);
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.openDoc", async (path: string) => {
      await openRemotePath(context, store, repos, draftsTree, path, docsTree);
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.editWorkspaceFile", async (uri?: vscode.Uri) => {
      await editWorkspaceFile(context, store, repos, draftsTree, docsTree, uri);
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.rename", async (item?: vscode.Uri | { uri?: vscode.Uri; path?: string }) => {
      if (item && typeof item === "object" && "path" in item && typeof item.path === "string" && !("fsPath" in item)) {
        await renameByRemotePath(context, store, repos, item.path, docsTree);
      } else {
        const uri = item instanceof vscode.Uri ? item : item?.uri;
        await renameCurrentDoc(context, repos, uri, docsTree);
      }
      library.refreshLabels();
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.delete", async (item?: vscode.Uri | { uri?: vscode.Uri; path?: string }) => {
      if (item && typeof item === "object" && "path" in item && typeof item.path === "string" && !("fsPath" in item)) {
        await deleteByRemotePath(context, store, repos, item.path, docsTree);
      } else {
        const uri = item instanceof vscode.Uri ? item : item?.uri;
        await deleteCurrentDoc(context, store, uri, docsTree);
      }
      library.refreshLabels();
      draftsTree.refresh();
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.refreshDrafts", () => draftsTree.refresh()),
    vscode.commands.registerCommand("slash-md.refreshDocs", () => docsTree.refresh()),
    vscode.commands.registerCommand("slash-md.signInGithub", async () => {
      await getGithubToken();
      docsTree.refresh();
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.init", async () => {
      const ok = await runInit(context);
      if (ok) {
        await refreshDocsWorkspaceContext();
        docsTree.refresh();
        await home.refresh();
      }
    }),
  );
}

async function bootstrapConfig(repos: ContentRepo): Promise<void> {
  const hint =
    getBoundContentRepo() ||
    vscode.workspace.getConfiguration("slash-md").get<string>("contentRepo")?.trim();
  await reloadSlashmdConfig({ contentRepo: hint });
  const config = getContentConfig();
  if (config) {
    await reloadSlashmdConfig({ contentRepo: config.repo, cloneDir: repos.cloneDir(config) });
  }
}

export function deactivate(): void {}
