import * as vscode from "vscode";
import { getDraftMeta } from "./draftMeta";
import { DraftStore } from "./draftStore";
import { folderMatchesContentRepo } from "./docsWorkspace";
import { ContentConfig, getContentConfig } from "./github/config";
import { ContentRepo } from "./github/contentRepo";
import { displayTitle } from "./messaging";
import { posixBasename, posixJoin } from "./paths";
import { getConfiguredSections } from "./slashmdConfig";

export type HomeTreeNode = {
  kind: "folder" | "file";
  path: string;
  title: string;
  badge?: string;
  children?: HomeTreeNode[];
};

export type HomeTreePayload = {
  repo: string;
  contentPath: string;
  needsAuth: boolean;
  needsInit: boolean;
  /** Tree came from the open workspace folder (no GitHub needed). */
  fromWorkspace: boolean;
  roots: HomeTreeNode[];
};

export async function buildHomeTree(opts: {
  context: vscode.ExtensionContext;
  store: DraftStore;
  repos: ContentRepo;
  token?: string;
}): Promise<HomeTreePayload> {
  const config = getContentConfig();
  if (!config) {
    return {
      repo: "",
      contentPath: "docs",
      needsAuth: false,
      needsInit: true,
      fromWorkspace: false,
      roots: [],
    };
  }

  const workspaceRoot = await docsWorkspaceRoot(config);
  let files: string[] | undefined;
  let fromWorkspace = false;

  if (workspaceRoot) {
    files = await listLocalMarkdown(workspaceRoot, config.contentPath);
    fromWorkspace = true;
  } else if (opts.token) {
    await opts.repos.ensureFetched(config, opts.token);
    files = await opts.repos.listMarkdown(config, opts.token);
  } else {
    return {
      repo: config.repo,
      contentPath: config.contentPath,
      needsAuth: true,
      needsInit: false,
      fromWorkspace: false,
      roots: [],
    };
  }

  const draftBadges = await draftBadgeMap(opts.context, opts.store);
  const titleCache = new Map<string, string>();
  const configured = getConfiguredSections(config.contentPath);

  const roots = await buildLevel(config.contentPath, files, configured, async (path) => {
    const cached = titleCache.get(path);
    if (cached) {
      return cached;
    }
    const title = await titleFor(opts, path, draftBadges.has(path), workspaceRoot);
    titleCache.set(path, title);
    return title;
  }, draftBadges);

  return {
    repo: config.repo,
    contentPath: config.contentPath,
    needsAuth: false,
    needsInit: false,
    fromWorkspace,
    roots,
  };
}

export async function docsWorkspaceRoot(config: ContentConfig): Promise<vscode.Uri | undefined> {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    if (await folderMatchesContentRepo(folder.uri, config)) {
      return folder.uri;
    }
  }
  return undefined;
}

export async function listLocalMarkdown(folder: vscode.Uri, contentPath: string): Promise<string[]> {
  const root = contentPath
    ? vscode.Uri.joinPath(folder, ...contentPath.split("/").filter(Boolean))
    : folder;
  const out: string[] = [];
  await walkMd(root, contentPath, out);
  return out.sort();
}

async function walkMd(dir: vscode.Uri, prefix: string, out: string[]): Promise<void> {
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(dir);
  } catch {
    return;
  }
  for (const [name, type] of entries) {
    if (name.startsWith(".")) {
      continue;
    }
    const rel = posixJoin(prefix, name);
    if (type === vscode.FileType.Directory) {
      await walkMd(vscode.Uri.joinPath(dir, name), rel, out);
    } else if (name.endsWith(".md") && !name.endsWith(".slash.md")) {
      out.push(rel);
    }
  }
}

async function titleFor(
  opts: { context: vscode.ExtensionContext; store: DraftStore; repos: ContentRepo },
  remotePath: string,
  preferDraft: boolean,
  workspaceRoot?: vscode.Uri,
): Promise<string> {
  const filename = posixBasename(remotePath);
  const config = getContentConfig();
  if (preferDraft) {
    for (const uri of await opts.store.listDrafts()) {
      const meta = getDraftMeta(opts.context, uri);
      if (meta.remotePath !== remotePath && meta.sourcePath !== remotePath) {
        continue;
      }
      try {
        const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
        return displayTitle(text, filename);
      } catch {
        break;
      }
    }
  }
  if (workspaceRoot) {
    try {
      const uri = vscode.Uri.joinPath(workspaceRoot, ...remotePath.split("/").filter(Boolean));
      const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
      return displayTitle(text, filename);
    } catch {
      // fall through
    }
  }
  if (!config) {
    return filename;
  }
  try {
    const text = await opts.repos.readFile(config, remotePath);
    return displayTitle(text, filename);
  } catch {
    return filename;
  }
}

async function draftBadgeMap(
  context: vscode.ExtensionContext,
  store: DraftStore,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const uri of await store.listDrafts()) {
    const meta = getDraftMeta(context, uri);
    let badge = "editing";
    if (meta.pendingDelete) {
      badge = meta.prNumber ? `delete · #${meta.prNumber}` : "delete";
    } else if (meta.kind === "in_review" && meta.label) {
      badge = meta.label;
    } else if (meta.kind === "ahead") {
      badge = "editing · ahead";
    }
    if (meta.remotePath) {
      map.set(meta.remotePath, badge);
    }
    if (meta.sourcePath) {
      map.set(meta.sourcePath, badge);
    }
  }
  return map;
}

async function buildLevel(
  dir: string,
  files: string[],
  configuredSections: string[],
  titleOf: (path: string) => Promise<string>,
  badges: Map<string, string>,
): Promise<HomeTreeNode[]> {
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

  for (const section of configuredSections) {
    if (section === dir) {
      continue;
    }
    const rel = relativeTo(dir, section);
    if (rel === undefined) {
      continue;
    }
    const slash = rel.indexOf("/");
    if (slash < 0) {
      folders.add(section);
    } else {
      folders.add(`${dir}/${rel.slice(0, slash)}`);
    }
  }

  const nodes: HomeTreeNode[] = [];
  for (const path of [...folders].sort()) {
    nodes.push({
      kind: "folder",
      path,
      title: posixBasename(path) || path,
      children: await buildLevel(path, files, configuredSections, titleOf, badges),
    });
  }
  for (const path of docs.sort()) {
    nodes.push({
      kind: "file",
      path,
      title: await titleOf(path),
      badge: badges.get(path),
    });
  }
  return nodes;
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
