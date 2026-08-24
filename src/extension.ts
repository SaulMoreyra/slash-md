import * as vscode from "vscode";
import { editWorkspaceFile } from "./sidecar/claimWorkspace";
import { DocsTreeProvider } from "./library/docsTree";
import { refreshDocsWorkspaceContext, watchDocsWorkspaceContext } from "./workspace/docsWorkspace";
import { DraftStore } from "./sidecar/draftStore";
import { DraftsTreeProvider } from "./library/draftsTree";
import { SlashMdEditorProvider } from "./editor/editorProvider";
import { getContentConfig } from "./github/config";
import { getGithubToken } from "./github/auth";
import { ContentRepo } from "./github/contentRepo";
import { HomePanel } from "./home/homePanel";
import { invalidateInboxCache } from "./github/inbox";
import { InboxHost } from "./library/inboxHost";
import { runInit } from "./workspace/init";
import { LibraryViews } from "./library/libraryViews";
import { createNewDraft } from "./workspace/newDraft";
import { createNewFolder } from "./workspace/newFolder";
import { openFromGithub, openRemotePath } from "./sidecar/openFromGithub";
import { deleteByRemotePath, deleteCurrentDoc, renameByRemotePath, renameCurrentDoc } from "./workspace/renameDoc";
import { reloadSlashmdConfig, restoreBoundContentRepo, getBoundContentRepo } from "./config/slashmdConfig";
import { registerMarkdownAssociation } from "./editor/markdownAssociation";
import { SlashMdUriHandler } from "./workspace/uriHandler";

export function activate(context: vscode.ExtensionContext): void {
  const store = new DraftStore(context);
  const draftsTree = new DraftsTreeProvider(store, context);
  const repos = new ContentRepo(context);
  const docsTree = new DocsTreeProvider(repos, context, store);
  const inboxHost = new InboxHost();
  const draftsView = vscode.window.createTreeView("slash-md.drafts", {
    treeDataProvider: draftsTree,
  });
  const docsView = vscode.window.createTreeView("slash-md.docs", {
    treeDataProvider: docsTree,
  });
  inboxHost.attachTreeView(draftsView);
  const home = new HomePanel(context, store, repos, draftsTree, docsTree, inboxHost);
  const library = new LibraryViews(draftsTree, docsTree, home, inboxHost);
  const provider = new SlashMdEditorProvider(context, library);

  const syncTreeVisibility = () => {
    inboxHost.setTreeVisible(draftsView.visible || docsView.visible);
  };
  context.subscriptions.push(
    draftsView.onDidChangeVisibility(syncTreeVisibility),
    docsView.onDidChangeVisibility(syncTreeVisibility),
  );
  syncTreeVisibility();
  void inboxHost.refreshBadge();

  watchDocsWorkspaceContext(context.subscriptions);
  restoreBoundContentRepo(context);
  void bootstrapConfig(repos).then(() => autoOpenHome(context, home));
  registerMarkdownAssociation(context);
  context.subscriptions.push(vscode.window.registerUriHandler(new SlashMdUriHandler()));

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(SlashMdEditorProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: false,
    }),
    draftsView,
    docsView,
    inboxHost,
    vscode.commands.registerCommand("slash-md.home", () => home.show()),
    vscode.commands.registerCommand("slash-md.new", async () => {
      await createNewDraft({ context, repos, draftsTree, docsTree });
      await home.refresh();
    }),
    vscode.commands.registerCommand("slash-md.newInFolder", async (node?: { path?: string }) => {
      await createNewDraft({ context, repos, draftsTree, docsTree, section: node?.path });
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
    vscode.commands.registerCommand("slash-md.sendToReview", async () => {
      await home.sendToReview();
    }),
    vscode.commands.registerCommand("slash-md.publishBatch", async () => {
      await home.publishBatch();
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
      invalidateInboxCache();
      await home.refresh();
      await inboxHost.refreshBadge();
    }),
    vscode.commands.registerCommand("slash-md.init", async () => {
      const ok = await runInit(context);
      if (ok) {
        await refreshDocsWorkspaceContext();
        docsTree.refresh();
        await home.show();
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

async function autoOpenHome(
  context: vscode.ExtensionContext,
  home: HomePanel,
): Promise<void> {
  const isDocs = await refreshDocsWorkspaceContext();
  if (!isDocs) {
    return;
  }
  const repo = getContentConfig()?.repo ?? "";
  const key = `slashMd.autoHomeShown.${repo}`;
  if (context.globalState.get<boolean>(key)) {
    return;
  }
  await context.globalState.update(key, true);
  if (!vscode.window.activeTextEditor) {
    await home.show();
  }
}

export function deactivate(): void {}
