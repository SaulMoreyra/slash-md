import { editWorkspaceFile } from "./claimWorkspace";
import { DraftStore } from "./draftStore";
import { getContentConfig } from "./github/config";
import { getGithubToken } from "./github/auth";
import { ContentRepo } from "./github/contentRepo";
import { homeHtml, getNonce, HomeFromWebview, HomeToWebview } from "./homeHtml";
import { buildHomeTree, docsWorkspaceRoot } from "./homeTree";
import { runInit } from "./init";
import { createNewDraft } from "./newDraft";
import { createNewFolder } from "./newFolder";
import { openRemotePath } from "./openFromGithub";
import { deleteByRemotePath, renameByRemotePath } from "./renameDoc";
import { reloadSlashmdConfig } from "./slashmdConfig";
import { refreshDocsWorkspaceContext } from "./docsWorkspace";
import * as vscode from "vscode";

export class HomePanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly store: DraftStore,
    private readonly repos: ContentRepo,
    private readonly draftsTree: { refresh(): void },
    private readonly docsTree: { refresh(): void },
  ) {}

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      await this.pushTree();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "slash-md.home",
      "Slash MD",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );
    this.panel = panel;

    const nonce = getNonce();
    panel.webview.html = homeHtml({
      nonce,
      cspSource: panel.webview.cspSource,
      jsUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "home.js")).toString(),
      cssUri: panel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "home.css")).toString(),
    });

    panel.webview.onDidReceiveMessage(async (message: HomeFromWebview) => {
      if (!message?.type) {
        return;
      }
      if (message.type === "ready" || message.type === "refresh") {
        await this.pushTree();
        return;
      }
      if (message.type === "open" && typeof message.path === "string") {
        await this.openDoc(message.path);
        await this.refresh();
        return;
      }
      if (message.type === "rename" && typeof message.path === "string") {
        await renameByRemotePath(this.context, this.store, this.repos, message.path, this.docsTree);
        this.draftsTree.refresh();
        await this.refresh();
        return;
      }
      if (message.type === "delete" && typeof message.path === "string") {
        await deleteByRemotePath(this.context, this.store, this.repos, message.path, this.docsTree);
        this.draftsTree.refresh();
        await this.refresh();
        return;
      }
      if (message.type === "new") {
        await createNewDraft({
          context: this.context,
          store: this.store,
          repos: this.repos,
          draftsTree: this.draftsTree,
          docsTree: this.docsTree,
          section: message.section,
        });
        await this.refresh();
        return;
      }
      if (message.type === "newFolder") {
        await createNewFolder({
          context: this.context,
          parent: message.parent,
        });
        this.docsTree.refresh();
        await this.refresh();
        return;
      }
      if (message.type === "init") {
        const ok = await runInit(this.context);
        if (ok) {
          await refreshDocsWorkspaceContext();
          this.docsTree.refresh();
          await this.pushTree();
        }
        return;
      }
      if (message.type === "signIn") {
        await getGithubToken();
        await this.pushTree();
      }
    });

    panel.onDidDispose(() => {
      this.panel = undefined;
    });

    await this.pushTree();
  }

  async refresh(): Promise<void> {
    if (!this.panel) {
      return;
    }
    await this.pushTree();
  }

  private async pushTree(): Promise<void> {
    if (!this.panel) {
      return;
    }
    const settingsRepo = vscode.workspace.getConfiguration("slash-md").get<string>("contentRepo")?.trim();
    await reloadSlashmdConfig({
      contentRepo: getContentConfig()?.repo || settingsRepo,
      cloneDir: getContentConfig() ? this.repos.cloneDir(getContentConfig()!) : undefined,
    });

    const token = await vscode.authentication.getSession("github", ["repo"], { silent: true });
    try {
      const payload = await buildHomeTree({
        context: this.context,
        store: this.store,
        repos: this.repos,
        token: token?.accessToken,
      });
      await this.post({ type: "tree", payload });
      if (payload.needsInit) {
        await this.post({ type: "status", message: "Repo not configured. Use Init." });
      } else if (payload.needsAuth) {
        await this.post({
          type: "status",
          message: "Sign in to GitHub to see the remote tree (or open the docs repo as a folder).",
        });
      } else if (payload.roots.length === 0) {
        await this.post({ type: "status", message: "No documents yet. Create one with New." });
      } else {
        await this.post({
          type: "status",
          message: payload.fromWorkspace ? "From local workspace" : "",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.post({ type: "status", message: `Could not load: ${message}` });
    }
  }

  private async openDoc(remotePath: string): Promise<void> {
    const config = getContentConfig();
    if (!config) {
      await openRemotePath(this.context, this.store, this.repos, this.draftsTree, remotePath, this.docsTree);
      return;
    }
    const root = await docsWorkspaceRoot(config);
    if (root) {
      const uri = vscode.Uri.joinPath(root, ...remotePath.split("/").filter(Boolean));
      await editWorkspaceFile(this.context, this.store, this.repos, this.draftsTree, this.docsTree, uri);
      return;
    }
    await openRemotePath(this.context, this.store, this.repos, this.draftsTree, remotePath, this.docsTree);
  }

  private async post(message: HomeToWebview): Promise<void> {
    await this.panel?.webview.postMessage(message);
  }
}
