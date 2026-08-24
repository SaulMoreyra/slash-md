import * as vscode from "vscode";
import { getContentConfig } from "../github/config";
import { ContentRepo } from "../github/contentRepo";
import { listLocalDirs } from "../home/homeTree";
import { posixBasename, posixDirname, posixJoin } from "../domain/paths";
import { getConfiguredSections } from "../config/slashmdConfig";

export async function pickSection(
  repos: ContentRepo,
  contentPath: string,
  opts?: { title?: string; current?: string; workspaceRoot?: vscode.Uri },
): Promise<string | undefined> {
  const config = getContentConfig();
  let dirs = [contentPath];
  if (opts?.workspaceRoot) {
    dirs = await listLocalDirs(opts.workspaceRoot, contentPath);
  } else if (config) {
    try {
      const token = await vscode.authentication.getSession("github", ["repo"], { createIfNone: false });
      if (token) {
        dirs = await repos.listDirs(config, token.accessToken);
        if (!dirs.includes(contentPath)) {
          dirs.unshift(contentPath);
        }
      }
    } catch {
      dirs = [contentPath];
    }
  }

  // Repo-root contentPath is ""; keep a single root entry.
  dirs = [...new Set(dirs.map((d) => d || ""))];

  for (const section of getConfiguredSections(contentPath)) {
    if (!dirs.includes(section)) {
      dirs.push(section);
    }
  }
  dirs.sort((a, b) => a.localeCompare(b));

  if (opts?.current && !dirs.includes(opts.current)) {
    dirs.push(opts.current);
    dirs.sort((a, b) => a.localeCompare(b));
  }

  const items = [
    ...dirs.map((path) => ({
      label: !path ? ". (repo root)" : path === contentPath && path ? `${path} (content root)` : path,
      path,
      description: opts?.current === path ? "current" : undefined,
    })),
    { label: "Other folder…", path: "__other__", description: undefined as string | undefined },
  ];
  const picked = await vscode.window.showQuickPick(items, {
    title: opts?.title ?? "Where to create the document",
    placeHolder: "Section",
    ignoreFocusOut: true,
  });
  if (!picked) {
    return undefined;
  }
  if (picked.path !== "__other__") {
    return picked.path;
  }
  const typed = await vscode.window.showInputBox({
    title: "Folder inside the docs repo",
    value: opts?.current ? `${opts.current}/` : contentPath ? `${contentPath}/` : "",
    ignoreFocusOut: true,
  });
  const next = typed?.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (next === undefined) {
    return undefined;
  }
  return !next || next === "." ? "" : next;
}

export async function pickMoveTarget(
  repos: ContentRepo,
  contentPath: string,
  currentPath: string,
): Promise<string | undefined> {
  const currentDir = posixDirname(currentPath) || contentPath;
  const currentName = posixBasename(currentPath);

  const section = await pickSection(repos, contentPath, {
    title: "Move to folder",
    current: currentDir,
  });
  if (section === undefined) {
    return undefined;
  }

  const filename = await vscode.window.showInputBox({
    title: "File name",
    value: currentName,
    ignoreFocusOut: true,
    validateInput: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return "Name cannot be empty";
      }
      if (trimmed.includes("/") || trimmed.includes("\\")) {
        return "File name only, no folders";
      }
      if (!trimmed.endsWith(".md") || trimmed.endsWith(".slash.md")) {
        return "File must end with .md";
      }
      return undefined;
    },
  });
  if (!filename?.trim()) {
    return undefined;
  }

  return posixJoin(section || contentPath, filename.trim());
}
