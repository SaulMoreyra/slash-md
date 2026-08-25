import * as vscode from "vscode";
import { posixJoin } from "@slash-md/core/paths";
import type { SlashmdFile } from "../config/slashmdConfig";
import {
  BUILTIN_TEMPLATE_PICKS,
  TEMPLATE_MANIFEST,
  TemplateManifest,
  TemplatePick,
  mergeTemplatePicks,
  parseTemplateManifest,
  resolveTemplatesPath,
  workspaceTemplatePicks,
} from "@slash-md/core/templates";

export async function listAvailableTemplates(opts: {
  workspaceRoot?: vscode.Uri;
  extensionUri: vscode.Uri;
  contentPath: string;
  slashmd?: Pick<SlashmdFile, "templatesPath">;
}): Promise<TemplatePick[]> {
  const workspace = opts.workspaceRoot
    ? await listWorkspaceTemplates(opts.workspaceRoot, opts.contentPath, opts.slashmd?.templatesPath)
    : [];
  return mergeTemplatePicks(workspace, BUILTIN_TEMPLATE_PICKS);
}

export async function loadTemplateSource(opts: {
  id: string;
  workspaceRoot?: vscode.Uri;
  extensionUri: vscode.Uri;
  contentPath: string;
  slashmd?: Pick<SlashmdFile, "templatesPath">;
}): Promise<string> {
  if (opts.workspaceRoot) {
    const fromWorkspace = await readWorkspaceTemplate(
      opts.workspaceRoot,
      opts.contentPath,
      opts.slashmd?.templatesPath,
      opts.id,
    );
    if (fromWorkspace !== undefined) {
      return fromWorkspace;
    }
  }
  return loadBuiltinTemplate(opts.extensionUri, opts.id);
}

export async function loadBuiltinTemplate(extensionUri: vscode.Uri, id: string): Promise<string> {
  const uri = vscode.Uri.joinPath(extensionUri, "templates", `${id}.md`);
  const bytes = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString("utf8");
}

async function listWorkspaceTemplates(
  workspaceRoot: vscode.Uri,
  contentPath: string,
  configuredPath?: string,
): Promise<TemplatePick[]> {
  const templatesPath = resolveTemplatesPath(contentPath, configuredPath);
  const dir = vscode.Uri.joinPath(workspaceRoot, ...templatesPath.split("/").filter(Boolean));
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(dir);
  } catch {
    return [];
  }

  const manifest = await readWorkspaceManifest(dir);
  const names = entries.filter(([, type]) => type === vscode.FileType.File).map(([name]) => name);
  return workspaceTemplatePicks(names, manifest);
}

async function readWorkspaceManifest(dir: vscode.Uri): Promise<TemplateManifest> {
  try {
    const raw = Buffer.from(
      await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dir, TEMPLATE_MANIFEST)),
    ).toString("utf8");
    return parseTemplateManifest(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function readWorkspaceTemplate(
  workspaceRoot: vscode.Uri,
  contentPath: string,
  configuredPath: string | undefined,
  id: string,
): Promise<string | undefined> {
  const templatesPath = resolveTemplatesPath(contentPath, configuredPath);
  const uri = vscode.Uri.joinPath(
    workspaceRoot,
    ...posixJoin(templatesPath, `${id}.md`).split("/").filter(Boolean),
  );
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString("utf8");
  } catch {
    return undefined;
  }
}
