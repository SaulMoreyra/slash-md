import * as vscode from "vscode";
import { getContentConfig } from "../github/config";
import { docsWorkspaceRoot } from "../home/homeTree";
import { resolveContentConfig } from "../sidecar/openFromGithub";
import { posixJoin, posixNormalize } from "../domain/paths";
import { slugify } from "../domain/slug";
import {
  getConfiguredSections,
  getSlashmdFile,
  reloadSlashmdConfig,
  writeWorkspaceSlashmd,
} from "../config/slashmdConfig";

export async function createNewFolder(opts: {
  context: vscode.ExtensionContext;
  parent?: string;
}): Promise<string | undefined> {
  const config = getContentConfig() ?? (await resolveContentConfig(opts.context));
  if (!config) {
    return undefined;
  }

  const parent = normalizeParent(opts.parent, config.contentPath);
  const typed = await vscode.window.showInputBox({
    title: "Slash MD: New folder",
    prompt: parent === config.contentPath ? "Folder name" : `Folder inside ${parent}`,
    placeHolder: "product",
    ignoreFocusOut: true,
    validateInput: (value) => validateFolderName(value),
  });
  if (typed === undefined) {
    return undefined;
  }

  const segment = slugify(typed.trim()) || typed.trim().replace(/\s+/g, "-");
  if (!segment) {
    return undefined;
  }

  let folderPath: string;
  try {
    folderPath = assertSafeFolderPath(config.contentPath, posixJoin(parent, segment));
  } catch (err) {
    await vscode.window.showErrorMessage(err instanceof Error ? err.message : "Invalid path");
    return undefined;
  }

  const existing = getConfiguredSections(config.contentPath);
  if (existing.includes(folderPath)) {
    await vscode.window.showInformationMessage(`Folder already exists: ${folderPath}`);
    return folderPath;
  }

  const prev = getSlashmdFile().sections ?? [];
  const nextSections = [...new Set([...prev, folderPath])].sort();

  try {
    await writeWorkspaceSlashmd({ sections: nextSections });
  } catch (err) {
    await vscode.window.showErrorMessage(
      err instanceof Error ? err.message : "Could not save .slashmd.json",
    );
    return undefined;
  }

  await reloadSlashmdConfig({ contentRepo: config.repo });

  const root = await docsWorkspaceRoot(config);
  if (root) {
    try {
      const dir = vscode.Uri.joinPath(root, ...folderPath.split("/").filter(Boolean));
      await vscode.workspace.fs.createDirectory(dir);
    } catch {
      // Sections already persist the folder in the UI even if mkdir fails.
    }
  }

  await vscode.window.showInformationMessage(
    `Folder ready: ${folderPath}. Use New page to create the first document.`,
  );
  return folderPath;
}

function normalizeParent(parent: string | undefined, contentPath: string): string {
  if (!parent?.trim()) {
    return contentPath;
  }
  const normalized = posixNormalize(parent.trim().replace(/^\/+|\/+$/g, ""));
  if (!contentPath) {
    return normalized;
  }
  if (normalized === contentPath || normalized.startsWith(`${contentPath}/`)) {
    return normalized;
  }
  return posixJoin(contentPath, normalized);
}

function validateFolderName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Enter a name";
  }
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) {
    return "Folder name only (no /)";
  }
  if (trimmed.endsWith(".md")) {
    return "That looks like a file; use New page for documents";
  }
  return undefined;
}

function assertSafeFolderPath(contentPath: string, folderPath: string): string {
  const normalized = posixNormalize(folderPath.replace(/^\/+|\/+$/g, ""));
  if (!normalized || normalized.includes("..") || normalized.startsWith(".git")) {
    throw new Error("Invalid folder path.");
  }
  if (contentPath) {
    if (normalized !== contentPath && !normalized.startsWith(`${contentPath}/`)) {
      throw new Error(`The folder must live under ${contentPath}/.`);
    }
    if (normalized === contentPath) {
      throw new Error("Choose a name other than the docs root.");
    }
  }
  return normalized;
}
