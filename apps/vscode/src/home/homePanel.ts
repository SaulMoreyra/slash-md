import { DraftStore } from "../sidecar/draftStore";
import { ContentRepo } from "../github/contentRepo";
import type { HomeToWebview, ReviewPreviewItem } from "@slash-md/core/homeProtocol";
import { homeHtml, getNonce } from "./homeHtml";
import { buildHomeTree, docsWorkspaceRoot, listLocalMarkdown } from "./homeTree";
import {
  toggleStagingPath,
  writeStagingSelection,
  listLocalDrafts,
  readStagingSelection,
} from "../workspace/localDrafts";
import { posixNormalize } from "@slash-md/core/paths";
import { splitFrontmatter } from "@slash-md/core/frontmatter";
import { runGit } from "../github/git";
import { runInit } from "../workspace/init";
import { createNewDraft } from "../workspace/newDraft";
import { createNewFolder } from "../workspace/newFolder";
import { openRemotePath } from "../sidecar/openFromGithub";
import { deleteByRemotePath, renameByRemotePath } from "../workspace/renameDoc";
import {
  reloadSlashmdConfig,
  getSlashmdFile,
  writeWorkspaceSlashmd,
  type SlashmdFile,
} from "../config/slashmdConfig";
import { refreshDocsWorkspaceContext } from "../workspace/docsWorkspace";
import { sendBatchToReview } from "../github/batchReview";
import { publishBatch } from "../github/batchPublish";
import {
  findWorkspaceFileForInbox,
  invalidateInboxCache,
  snippetFromWorkspaceFile,
} from "../github/inbox";
import { readWorkspaceHeadBranch } from "../github/workspaceBranch";
import {
  reviewContextBannerText,
  shouldShowReviewContextBanner,
} from "@slash-md/core/reviewContext";
import { parsePrNumber } from "@slash-md/core/threadGate";
import { notifyEditorWhenReady } from "../editor/editorLive";
import { InboxHost } from "../library/inboxHost";
import { getContentConfig } from "../github/config";
import { getGithubToken } from "../github/auth";
import { routeHomeMessage } from "./homeMessageRouter";
import type { HomePanelDeps } from "./homePanelDeps";
import * as vscode from "vscode";

const MISSING_DOCS_REPO = "Open the docs repo as a folder.";
const OPEN_ON_GITHUB = "Open on GitHub";

export class HomePanel {
  private panel: vscode.WebviewPanel | undefined;
  private readonly deps: HomePanelDeps;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly store: DraftStore,
    private readonly repos: ContentRepo,
    private readonly draftsTree: { refresh(): void },
    private readonly docsTree: { refresh(): void },
    private readonly inbox: InboxHost,
  ) {
    this.inbox.onHomeTick = () => this.pushTree();
    this.deps = {
      pushTree: () => this.pushTree(),
      refresh: () => this.refresh(),
      invalidateInboxAndPushTree: async () => {
        invalidateInboxCache();
        await this.pushTree();
      },
      openDoc: (path) => this.openDoc(path),
      renameDoc: (path) => renameByRemotePath(this.context, this.store, this.repos, path, this.docsTree),
      deleteDoc: (path) => deleteByRemotePath(this.context, this.store, this.repos, path, this.docsTree),
      createNew: (section) =>
        createNewDraft({
          context: this.context,
          repos: this.repos,
          draftsTree: this.draftsTree,
          docsTree: this.docsTree,
          section,
        }),
      createFolder: (parent) =>
        createNewFolder({
          context: this.context,
          parent,
        }).then(() => {
          this.docsTree.refresh();
        }),
      runWorkspaceInit: async () => {
        const ok = await runInit(this.context);
        if (ok) {
          await refreshDocsWorkspaceContext();
          this.docsTree.refresh();
          await this.pushTree();
        }
      },
      signInGithub: async () => {
        await getGithubToken();
        await this.pushTree();
      },
      toggleDraft: (path) => toggleStagingPath(this.context, path),
      selectAllDrafts: () => this.selectAllDrafts(),
      setDraftSelection: (paths) => writeStagingSelection(this.context, paths),
      previewReview: () => this.handlePreviewReview(),
      reviewBatch: () => this.handleReviewBatch(),
      publishBatch: () => this.handlePublishBatch(),
      openInbox: (item) => this.openInbox(item),
      getConfig: () => this.handleGetConfig(),
      saveConfig: (config) => this.handleSaveConfig(config),
      renameFolder: (path) => this.handleRenameFolder(path),
      openIndex: () => this.handleOpenIndex(),
      createIndex: () => this.handleCreateIndex(),
      postReviewPreview: (items) => this.post({ type: "reviewPreview", items }),
    };
  }

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

    panel.webview.onDidReceiveMessage(async (message) => {
      await routeHomeMessage(this.deps, message);
    });

    panel.onDidChangeViewState(() => {
      this.inbox.setHomeVisible(Boolean(this.panel?.visible));
    });

    panel.onDidDispose(() => {
      this.inbox.setHomeVisible(false);
      this.panel = undefined;
    });

    this.inbox.setHomeVisible(true, { refresh: false });
    await this.pushTree();
  }

  async refresh(): Promise<void> {
    if (!this.panel) {
      return;
    }
    await this.pushTree();
    this.draftsTree.refresh();
  }

  async sendToReview(): Promise<void> {
    await this.handleReviewBatch();
  }

  async publishBatch(): Promise<void> {
    await this.handlePublishBatch();
  }

  private async handlePreviewReview(): Promise<void> {
    const config = getContentConfig();
    if (!config) {
      await vscode.window.showWarningMessage("Repo not configured. Use Init before sending pages to review.");
      return;
    }
    const root = await docsWorkspaceRoot(config);
    if (!root) {
      await vscode.window.showWarningMessage("Open the docs folder to send pages to review.");
      return;
    }
    const selected = readStagingSelection(this.context).map(posixNormalize).filter(Boolean);
    if (selected.length === 0) {
      await vscode.window.showWarningMessage("Select at least one local draft to send to review.");
      return;
    }
    const files = await listLocalMarkdown(root, config.contentPath);
    const drafts = await listLocalDrafts(root, config.contentPath, files);
    const live = new Map(drafts.map((d) => [d.path, d]));

    const items: ReviewPreviewItem[] = [];
    for (const path of selected) {
      const draft = live.get(path);
      if (!draft) {
        continue;
      }
      let summary = "";
      try {
        const stat = await runGit(["diff", "--stat", "--", path], { cwd: root.fsPath });
        const lastLine = stat.trim().split("\n").pop()?.trim() ?? "";
        summary = lastLine || "sin cambios locales";
      } catch {
        summary = "nuevo";
      }
      items.push({
        path,
        title: draft.title,
        badge: draft.badge,
        summary,
      });
    }
    if (items.length === 0) {
      await vscode.window.showWarningMessage(
        "Selection includes files that are not local drafts. Refresh Home and try again.",
      );
      return;
    }
    await this.deps.postReviewPreview(items);
  }

  private async handleReviewBatch(): Promise<void> {
    await sendBatchToReview(this.context);
    this.draftsTree.refresh();
    this.docsTree.refresh();
    invalidateInboxCache();
    await this.refresh();
    await this.inbox.refreshBadge();
  }

  private async handlePublishBatch(): Promise<void> {
    await publishBatch(this.context);
    this.draftsTree.refresh();
    this.docsTree.refresh();
    invalidateInboxCache();
    await this.refresh();
    await this.inbox.refreshBadge();
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
        viewerLogin: token?.account.label,
      });
      this.inbox.applyCount(payload.inbox.length);
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

  private async selectAllDrafts(): Promise<void> {
    const config = getContentConfig();
    if (!config) {
      return;
    }
    const root = await docsWorkspaceRoot(config);
    if (!root) {
      return;
    }
    const files = await listLocalMarkdown(root, config.contentPath);
    const drafts = await listLocalDrafts(root, config.contentPath, files);
    await writeStagingSelection(
      this.context,
      drafts.map((draft) => draft.path),
    );
  }

  private async openInbox(item: {
    path: string;
    prNumber: number;
    threadId: string;
    prUrl?: string;
    snippet?: string;
    line?: number | null;
    startLine?: number | null;
  }): Promise<void> {
    const config = getContentConfig();
    const root = config ? await docsWorkspaceRoot(config) : undefined;
    if (!config || !root) {
      await vscode.window.showWarningMessage(MISSING_DOCS_REPO);
      return;
    }
    if (!Number.isFinite(item.prNumber) || item.prNumber <= 0) {
      await vscode.window.showWarningMessage(MISSING_DOCS_REPO);
      return;
    }

    const prUrl = item.prUrl?.trim() || "";
    const files = await listLocalMarkdown(root, config.contentPath);
    const uri = await findWorkspaceFileForInbox({
      root,
      path: item.path,
      prNumber: item.prNumber,
      files,
      snippet: item.snippet,
    });
    if (!uri) {
      await warnMissingInboxFile(prUrl, item.prNumber);
      return;
    }

    let snippet = item.snippet?.trim() ?? "";
    if (!snippet) {
      snippet = await snippetFromWorkspaceFile(uri, item.startLine ?? null, item.line ?? null);
    }

    await vscode.commands.executeCommand("vscode.openWith", uri, "slash-md.editor");

    const localBranch = await readWorkspaceHeadBranch(root.fsPath);
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    const fields = splitFrontmatter(text).fields;
    const localPr = parsePrNumber(fields.pr);
    const reviewBranch = fields.reviewBranch.trim() || undefined;
    const decision = shouldShowReviewContextBanner({
      localPr,
      inboxPr: item.prNumber,
      localBranch,
      reviewBranch,
      missingFile: false,
    });

    if (decision.show && prUrl) {
      const contextMsg = {
        type: "reviewContext" as const,
        mismatch: true,
        prNumber: item.prNumber,
        prUrl,
        localBranch,
        reviewBranch,
        reason: decision.reason,
        message: reviewContextBannerText({
          prNumber: item.prNumber,
          localBranch,
          reviewBranch,
          reason: decision.reason,
        }),
      };
      await notifyEditorWhenReady(uri, contextMsg);
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      await notifyEditorWhenReady(uri, contextMsg);
    }

    if (snippet) {
      const message = {
        type: "revealThread" as const,
        snippet,
        threadId: item.threadId || undefined,
      };
      await notifyEditorWhenReady(uri, message);
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      await notifyEditorWhenReady(uri, message);
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
      await vscode.commands.executeCommand("vscode.openWith", uri, "slash-md.editor");
      return;
    }
    await openRemotePath(this.context, this.store, this.repos, this.draftsTree, remotePath, this.docsTree);
  }

  private async handleGetConfig(): Promise<void> {
    const file = getSlashmdFile();
    await this.post({ type: "configResult", config: file });
  }

  private async handleSaveConfig(patch: SlashmdFile): Promise<void> {
    try {
      if (patch.contentPath !== undefined) {
        const raw = patch.contentPath.trim();
        if (/\.\.|^\.git(\/|$)/i.test(raw.replace(/^\.\/+/, ""))) {
          await this.post({ type: "configResult", config: getSlashmdFile(), ok: false, error: "Invalid content path." });
          return;
        }
        patch.contentPath = raw === "" || raw === "." || raw === "./" ? "." : raw.replace(/^\/+|\/+$/g, "");
      }
      await writeWorkspaceSlashmd(patch);
      const config = getContentConfig();
      await reloadSlashmdConfig({
        contentRepo: config?.repo,
        cloneDir: config ? this.repos.cloneDir(config) : undefined,
      });
      await refreshDocsWorkspaceContext();
      this.docsTree.refresh();
      await this.post({ type: "configResult", config: getSlashmdFile(), ok: true });
      await this.pushTree();
    } catch (err) {
      await this.post({
        type: "configResult",
        config: getSlashmdFile(),
        ok: false,
        error: err instanceof Error ? err.message : "Could not save.",
      });
    }
  }

  private async handleRenameFolder(folderPath: string): Promise<void> {
    const config = getContentConfig();
    if (!config) {
      return;
    }
    const root = await docsWorkspaceRoot(config);
    if (!root) {
      await vscode.window.showWarningMessage("Open the docs repo as a folder to rename.");
      return;
    }

    const { posixBasename, posixDirname, posixJoin } = await import("@slash-md/core/paths");
    const { slugify } = await import("@slash-md/core/slug");
    const currentName = posixBasename(folderPath);
    const parentDir = posixDirname(folderPath) || config.contentPath;

    const newName = await vscode.window.showInputBox({
      title: "Rename folder",
      value: currentName,
      ignoreFocusOut: true,
      validateInput: (value) => {
        const t = value.trim();
        if (!t) {
          return "Enter a name";
        }
        if (t.includes("/") || t.includes("\\") || t.includes("..")) {
          return "Folder name only (no /)";
        }
        return undefined;
      },
    });
    if (!newName?.trim() || newName.trim() === currentName) {
      return;
    }

    const segment = slugify(newName.trim()) || newName.trim().replace(/\s+/g, "-");
    const newPath = posixJoin(parentDir, segment);

    const oldUri = vscode.Uri.joinPath(root, ...folderPath.split("/").filter(Boolean));
    const newUri = vscode.Uri.joinPath(root, ...newPath.split("/").filter(Boolean));

    try {
      await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: false });
    } catch (err) {
      await vscode.window.showErrorMessage(err instanceof Error ? err.message : "Could not rename folder.");
      return;
    }

    const { getConfiguredSections, writeWorkspaceSlashmd: writeCfg, getSlashmdFile: getFile } = await import("../config/slashmdConfig");
    const prev = getFile().sections ?? [];
    const updated = prev.map((s) => {
      if (s === folderPath || s.startsWith(`${folderPath}/`)) {
        return newPath + s.slice(folderPath.length);
      }
      return s;
    });
    if (JSON.stringify(prev) !== JSON.stringify(updated)) {
      await writeCfg({ sections: updated });
      await reloadSlashmdConfig({ contentRepo: config.repo });
    }

    this.docsTree.refresh();
    await this.pushTree();
    await vscode.window.showInformationMessage(`Renamed to ${newPath}`);
  }

  private async handleOpenIndex(): Promise<void> {
    const config = getContentConfig();
    if (!config) {
      return;
    }
    const root = await docsWorkspaceRoot(config);
    if (!root) {
      return;
    }
    const { posixJoin } = await import("@slash-md/core/paths");
    const candidates = [posixJoin(config.contentPath, "README.md"), posixJoin(config.contentPath, "index.md")];
    for (const candidate of candidates) {
      const uri = vscode.Uri.joinPath(root, ...candidate.split("/").filter(Boolean));
      try {
        await vscode.workspace.fs.stat(uri);
        await vscode.commands.executeCommand("vscode.openWith", uri, "slash-md.editor");
        return;
      } catch {
        continue;
      }
    }
  }

  private async handleCreateIndex(): Promise<void> {
    const config = getContentConfig();
    if (!config) {
      return;
    }
    const root = await docsWorkspaceRoot(config);
    if (!root) {
      await vscode.window.showWarningMessage("Open the docs repo as a folder.");
      return;
    }

    const { getConfiguredSections } = await import("../config/slashmdConfig");
    const { posixJoin } = await import("@slash-md/core/paths");
    const sections = getConfiguredSections(config.contentPath);
    const repoName = config.repo.split("/").pop() || "Docs";

    const lines = [`# ${repoName}`, ""];
    if (sections.length > 0) {
      lines.push("## Sections", "");
      for (const section of sections) {
        const name = section.split("/").pop() || section;
        lines.push(`- [${name}](${section.replace(config.contentPath + "/", "")})`);
      }
      lines.push("");
    }

    const indexPath = posixJoin(config.contentPath, "README.md");
    const uri = vscode.Uri.joinPath(root, ...indexPath.split("/").filter(Boolean));
    await vscode.workspace.fs.writeFile(uri, Buffer.from(lines.join("\n"), "utf8"));
    await vscode.commands.executeCommand("vscode.openWith", uri, "slash-md.editor");
    this.docsTree.refresh();
    await this.pushTree();
  }

  private async post(message: HomeToWebview): Promise<void> {
    await this.panel?.webview.postMessage(message);
  }
}

async function warnMissingInboxFile(prUrl: string, prNumber: number): Promise<void> {
  if (prUrl) {
    const pick = await vscode.window.showWarningMessage(
      `This file is not in your local workspace. Comments are on PR #${prNumber}. Your other local changes were not touched.`,
      OPEN_ON_GITHUB,
    );
    if (pick === OPEN_ON_GITHUB) {
      await vscode.env.openExternal(vscode.Uri.parse(prUrl));
    }
    return;
  }
  await vscode.window.showWarningMessage(MISSING_DOCS_REPO);
}
