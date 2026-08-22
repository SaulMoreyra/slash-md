import * as vscode from "vscode";
import { draftBarState } from "./barState";
import { DraftMeta, getDraftMeta } from "./draftMeta";
import { DraftStore } from "./draftStore";
import { displayTitle } from "./messaging";
import { getContentConfig } from "./github/config";
import { posixBasename, posixDirname } from "./paths";

export type DraftNode =
  | { kind: "folder"; path: string }
  | { kind: "file"; uri: vscode.Uri; remotePath: string };

const UNLOCATED = "No location";

export class DraftsTreeProvider implements vscode.TreeDataProvider<DraftNode> {
  private readonly didChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.didChange.event;

  constructor(
    private readonly store: DraftStore,
    private readonly context: vscode.ExtensionContext,
  ) {}

  refresh(): void {
    this.didChange.fire();
  }

  async getTreeItem(element: DraftNode): Promise<vscode.TreeItem> {
    if (element.kind === "folder") {
      const label = element.path === UNLOCATED ? UNLOCATED : posixBasename(element.path) || element.path;
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Expanded);
      item.contextValue = "slashMdDraftFolder";
      item.iconPath = new vscode.ThemeIcon("folder");
      item.tooltip = element.path;
      return item;
    }

    const text = Buffer.from(await vscode.workspace.fs.readFile(element.uri)).toString("utf8");
    const meta = getDraftMeta(this.context, element.uri);
    const filename = element.uri.path.split("/").pop() ?? "draft";
    const title = displayTitle(text, filename);
    const status = draftBarState(meta, text, { mode: getContentConfig()?.mode ?? "workspace" });
    const item = new vscode.TreeItem(
      meta.pendingDelete ? `Delete: ${title}` : title,
      vscode.TreeItemCollapsibleState.None,
    );
    item.resourceUri = element.uri;
    item.contextValue = "slashMdDraft";
    item.iconPath = new vscode.ThemeIcon("markdown");
    item.description = draftDescription(element.remotePath, status.label, status.kind);
    item.tooltip = [title, element.remotePath || filename, status.label || status.kind].filter(Boolean).join("\n");
    item.command = {
      command: "vscode.openWith",
      title: "Open",
      arguments: [element.uri, "slash-md.editor"],
    };
    return item;
  }

  async getChildren(element?: DraftNode): Promise<DraftNode[]> {
    const entries = await this.listEntries();
    if (!element) {
      return rootChildren(entries);
    }
    if (element.kind !== "folder") {
      return [];
    }
    return entries
      .filter((entry) => folderOf(entry.remotePath) === element.path)
      .sort((a, b) => a.remotePath.localeCompare(b.remotePath))
      .map((entry) => ({ kind: "file" as const, uri: entry.uri, remotePath: entry.remotePath }));
  }

  private async listEntries(): Promise<{ uri: vscode.Uri; remotePath: string; meta: DraftMeta }[]> {
    const out: { uri: vscode.Uri; remotePath: string; meta: DraftMeta }[] = [];
    for (const uri of await this.store.listDrafts()) {
      const meta = getDraftMeta(this.context, uri);
      out.push({ uri, remotePath: meta.remotePath ?? "", meta });
    }
    return out;
  }
}

function rootChildren(entries: { uri: vscode.Uri; remotePath: string }[]): DraftNode[] {
  const folders = new Set<string>();
  const rootFiles: Extract<DraftNode, { kind: "file" }>[] = [];
  for (const entry of entries) {
    const folder = folderOf(entry.remotePath);
    if (folder === "") {
      rootFiles.push({ kind: "file", uri: entry.uri, remotePath: entry.remotePath });
    } else {
      folders.add(folder);
    }
  }
  const files = rootFiles.sort((a, b) => a.remotePath.localeCompare(b.remotePath));
  return [...[...folders].sort().map((path) => ({ kind: "folder" as const, path })), ...files];
}

function folderOf(remotePath: string): string {
  if (!remotePath) {
    return UNLOCATED;
  }
  const config = getContentConfig();
  const root = config?.contentPath ?? "docs";
  const dir = posixDirname(remotePath);
  if (!dir || dir === root) {
    return "";
  }
  if (root && dir.startsWith(`${root}/`)) {
    return dir;
  }
  return dir;
}

function draftDescription(remotePath: string, label: string, kind: string): string {
  const config = getContentConfig();
  const root = config?.contentPath ?? "docs";
  let folder = "";
  if (!remotePath) {
    folder = UNLOCATED;
  } else {
    const dir = posixDirname(remotePath);
    if (dir && dir !== root) {
      folder = root && dir.startsWith(`${root}/`) ? dir.slice(root.length + 1) : dir;
    } else {
      folder = root;
    }
  }
  const status = label || (kind === "draft" ? "" : kind);
  return [folder, status].filter(Boolean).join(" · ");
}
