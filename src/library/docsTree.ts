import * as vscode from "vscode";
import { DraftStore } from "../sidecar/draftStore";
import { getDraftMeta } from "../sidecar/draftMeta";
import { labeledTitle } from "../domain/messaging";
import { posixBasename } from "../domain/paths";
import { getContentConfig } from "../github/config";
import { ContentRepo } from "../github/contentRepo";

export type DocsNode = {
  kind: "folder" | "file";
  path: string;
};

export class DocsTreeProvider implements vscode.TreeDataProvider<DocsNode> {
  private readonly didChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.didChange.event;
  private cache: { files: string[]; at: number } | undefined;
  private titleCache = new Map<string, string>();
  private draftByPath = new Map<string, { label: string; kind: string }>();

  constructor(
    private readonly repos: ContentRepo,
    private readonly context: vscode.ExtensionContext,
    private readonly store: DraftStore,
  ) {}

  refresh(): void {
    this.cache = undefined;
    this.titleCache.clear();
    this.didChange.fire();
  }

  refreshLabels(): void {
    this.titleCache.clear();
    this.didChange.fire();
  }

  async getTreeItem(element: DocsNode): Promise<vscode.TreeItem> {
    if (element.kind === "folder") {
      const item = new vscode.TreeItem(posixBasename(element.path) || element.path, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = "slashMdFolder";
      item.iconPath = new vscode.ThemeIcon("folder");
      item.tooltip = element.path;
      return item;
    }

    const title = await this.titleFor(element.path);
    const item = new vscode.TreeItem(title, vscode.TreeItemCollapsibleState.None);
    item.contextValue = "slashMdDoc";
    item.iconPath = new vscode.ThemeIcon("markdown");
    item.tooltip = `${title}\n${element.path}`;
    const draft = this.draftByPath.get(element.path);
    if (draft) {
      if (draft.kind === "delete") {
        item.description = draft.label || "delete";
      } else if (draft.kind === "in_review" && draft.label) {
        item.description = draft.label;
      } else if (draft.kind === "ahead") {
        item.description = "editing · ahead";
      } else {
        item.description = "editing";
      }
    }
    item.command = {
      command: "slash-md.openDoc",
      title: "Open",
      arguments: [element.path],
    };
    return item;
  }

  async getChildren(element?: DocsNode): Promise<DocsNode[]> {
    const files = await this.listFiles();
    if (!files) {
      return [];
    }
    const config = getContentConfig();
    const root = config?.contentPath ?? "";
    return childrenOf(element?.path ?? root, files);
  }

  private async titleFor(remotePath: string): Promise<string> {
    const cached = this.titleCache.get(remotePath);
    if (cached) {
      return cached;
    }
    const filename = posixBasename(remotePath);
    // Prefer local draft body when open for edit (title may have changed).
    for (const uri of await this.store.listDrafts()) {
      const meta = getDraftMeta(this.context, uri);
      if (meta.remotePath !== remotePath && meta.sourcePath !== remotePath) {
        continue;
      }
      try {
        const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
        const title = labeledTitle(text, filename);
        this.titleCache.set(remotePath, title);
        return title;
      } catch {
        break;
      }
    }

    const config = getContentConfig();
    if (!config) {
      return filename;
    }
    try {
      const text = await this.repos.readFile(config, remotePath);
      const title = labeledTitle(text, filename);
      this.titleCache.set(remotePath, title);
      return title;
    } catch {
      this.titleCache.set(remotePath, filename);
      return filename;
    }
  }

  private async refreshDraftIndex(): Promise<void> {
    const map = new Map<string, { label: string; kind: string }>();
    for (const uri of await this.store.listDrafts()) {
      const meta = getDraftMeta(this.context, uri);
      const info = {
        label: meta.pendingDelete
          ? meta.prNumber
            ? `delete · #${meta.prNumber}`
            : "delete"
          : (meta.label ?? ""),
        kind: meta.pendingDelete ? "delete" : (meta.kind ?? "draft"),
      };
      if (meta.remotePath) {
        map.set(meta.remotePath, info);
      }
      if (meta.sourcePath) {
        map.set(meta.sourcePath, info);
      }
    }
    this.draftByPath = map;
  }

  private async listFiles(): Promise<string[] | undefined> {
    await this.refreshDraftIndex();
    if (this.cache && Date.now() - this.cache.at < 30_000) {
      await vscode.commands.executeCommand("setContext", "slashMd.docsNeedsAuth", false);
      return this.cache.files;
    }
    const config = getContentConfig();
    if (!config) {
      await vscode.commands.executeCommand("setContext", "slashMd.docsNeedsAuth", false);
      return undefined;
    }
    try {
      const session = await vscode.authentication.getSession("github", ["repo"], { silent: true });
      if (!session) {
        await vscode.commands.executeCommand("setContext", "slashMd.docsNeedsAuth", true);
        return undefined;
      }
      await vscode.commands.executeCommand("setContext", "slashMd.docsNeedsAuth", false);
      const files = await this.repos.listMarkdown(config, session.accessToken);
      this.cache = { files, at: Date.now() };
      return files;
    } catch {
      return undefined;
    }
  }
}

function childrenOf(dir: string, files: string[]): DocsNode[] {
  const folders = new Set<string>();
  const docs: string[] = [];
  for (const file of files) {
    const rel = relativeTo(dir, file);
    if (rel === undefined) {
      continue;
    }
    const slash = rel.indexOf("/");
    if (slash < 0) {
      docs.push(file);
    } else {
      folders.add(`${dir}/${rel.slice(0, slash)}`);
    }
  }
  return [
    ...[...folders].sort().map((path) => ({ kind: "folder" as const, path })),
    ...docs.sort().map((path) => ({ kind: "file" as const, path })),
  ];
}

function relativeTo(dir: string, file: string): string | undefined {
  if (file === dir) {
    return undefined;
  }
  if (!dir) {
    return file;
  }
  const prefix = `${dir}/`;
  if (!file.startsWith(prefix)) {
    return undefined;
  }
  return file.slice(prefix.length);
}
