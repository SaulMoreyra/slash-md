import * as vscode from "vscode";
import { resolveCreateWorkspaceRoot } from "./docsWorkspace";
import { getContentConfig } from "../github/config";
import { ContentRepo } from "../github/contentRepo";
import { posixJoin } from "../domain/paths";
import { pickSection } from "./sections";
import { getSlashmdFile } from "../config/slashmdConfig";
import { slugify } from "../domain/slug";
import {
  fillTemplate,
  templatePickerDetail,
  templatePickerLabel,
  todayDate,
} from "../domain/templates";
import { listAvailableTemplates, loadTemplateSource } from "./templateLoader";
import { assertSafeRepoPath } from "../github/review";

export async function createNewDraft(opts: {
  context: vscode.ExtensionContext;
  repos: ContentRepo;
  draftsTree: { refresh(): void };
  docsTree?: { refresh(): void };
  section?: string;
}): Promise<void> {
  const root = await resolveCreateWorkspaceRoot();
  if (!root) {
    await vscode.window.showWarningMessage(
      "Open a folder to create a page. Slash MD saves new pages as .md files in the workspace.",
    );
    return;
  }

  const contentPath = resolveContentPath();
  const template = await pickTemplate(opts.context, root, contentPath);
  if (!template) {
    return;
  }
  const title = await vscode.window.showInputBox({
    title: "Slash MD: New",
    prompt: "Document title",
    value: "Untitled",
    ignoreFocusOut: true,
  });
  if (!title?.trim()) {
    return;
  }

  const section = opts.section ?? (await pickSection(opts.repos, contentPath, { workspaceRoot: root }));
  if (section === undefined) {
    return;
  }

  const config = getContentConfig() ?? {
    repo: "",
    owner: "",
    name: "",
    contentPath,
    defaultBranch: "main",
    mode: "workspace" as const,
  };

  let repoPath: string;
  try {
    const dir = section || contentPath;
    repoPath = assertSafeRepoPath(config, await uniqueMarkdownPath(root, dir, slugify(title.trim())));
  } catch (err) {
    await vscode.window.showErrorMessage(err instanceof Error ? err.message : "Invalid document path.");
    return;
  }

  const slashmd = getSlashmdFile();
  const source = await loadTemplateSource({
    id: template,
    workspaceRoot: root,
    extensionUri: opts.context.extensionUri,
    contentPath,
    slashmd,
  });
  const markdown = fillTemplate(source, {
    title: title.trim(),
    date: todayDate(),
  });

  const uri = vscode.Uri.joinPath(root, ...repoPath.split("/").filter(Boolean));
  try {
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(uri, ".."));
    await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown, "utf8"));
  } catch (err) {
    await vscode.window.showErrorMessage(
      err instanceof Error ? err.message : "Could not write the new page.",
    );
    return;
  }

  opts.draftsTree.refresh();
  opts.docsTree?.refresh();
  await vscode.commands.executeCommand("vscode.openWith", uri, "slash-md.editor");
}

function resolveContentPath(): string {
  const fromConfig = getContentConfig()?.contentPath;
  if (fromConfig !== undefined) {
    return fromConfig;
  }
  const fromFile = getSlashmdFile().contentPath;
  if (fromFile !== undefined) {
    const t = fromFile.trim().replace(/^\/+|\/+$/g, "");
    return !t || t === "." ? "" : t;
  }
  const fromSettings = vscode.workspace
    .getConfiguration("slash-md")
    .get<string>("contentPath")
    ?.trim()
    .replace(/^\/+|\/+$/g, "");
  if (!fromSettings || fromSettings === ".") {
    return "";
  }
  return fromSettings;
}

async function uniqueMarkdownPath(root: vscode.Uri, dir: string, slug: string): Promise<string> {
  for (let attempt = 1; attempt < 1000; attempt += 1) {
    const name = attempt === 1 ? `${slug}.md` : `${slug}-${attempt}.md`;
    const repoPath = posixJoin(dir, name);
    const uri = vscode.Uri.joinPath(root, ...repoPath.split("/").filter(Boolean));
    if (!(await uriExists(uri))) {
      return repoPath;
    }
  }
  throw new Error("Could not find a free filename.");
}

async function uriExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function pickTemplate(
  context: vscode.ExtensionContext,
  workspaceRoot: vscode.Uri,
  contentPath: string,
): Promise<string | undefined> {
  const slashmd = getSlashmdFile();
  const picks = await listAvailableTemplates({
    workspaceRoot,
    extensionUri: context.extensionUri,
    contentPath,
    slashmd,
  });
  if (picks.length === 0) {
    return undefined;
  }
  const picked = await vscode.window.showQuickPick(
    picks.map((p) => ({
      ...p,
      label: templatePickerLabel(p),
      detail: templatePickerDetail(p),
    })),
    {
      title: "Slash MD: New",
      placeHolder: "Template",
      ignoreFocusOut: true,
    },
  );
  return picked?.id;
}
