import * as vscode from "vscode";
import { detectWorkspaceGit, folderHasDocsDir } from "../config/gitDetect";
import {
  bindContentRepo,
  normalizeRepoMode,
  peekWorkspaceSlashmd,
  reloadSlashmdConfig,
  writeWorkspaceSlashmd,
  type RepoMode,
} from "../config/slashmdConfig";

export async function runInit(context: vscode.ExtensionContext): Promise<boolean> {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!folder) {
    await vscode.window.showWarningMessage("Open a folder (the docs repo) to run Init.", { modal: true });
    return false;
  }

  const detected = await detectWorkspaceGit(folder);
  const slashmd = await peekWorkspaceSlashmd();
  const suggestedPath =
    slashmd?.contentPath?.trim() || ((await folderHasDocsDir(folder)) ? "docs" : ".");
  const suggestedBranch = slashmd?.defaultBranch?.trim() || detected.branch;
  let repo = slashmd?.repo?.trim() || detected.repo;

  if (repo) {
    const choice = await vscode.window.showInformationMessage(
      `Use this repo for documentation?\n\n${repo}\nFolder: ${suggestedPath}\nBranch: ${suggestedBranch}${
        slashmd ? "\n(from .slashmd.json)" : ""
      }\n\nConfig will be saved to .slashmd.json (not .vscode/settings.json).`,
      { modal: true },
      "Use this repo",
      "Choose another",
    );
    if (!choice) {
      return false;
    }
    if (choice === "Choose another") {
      repo = undefined;
    }
  }

  if (!repo) {
    repo = await vscode.window.showInputBox({
      title: "Slash MD: Init",
      prompt: "GitHub repo (owner/name)",
      placeHolder: "SaulMoreyra/docs-sandbox",
      value: slashmd?.repo?.trim() || detected.repo || "",
      validateInput: (value) => (/^[^/\s]+\/[^/\s]+$/.test(value.trim()) ? undefined : "Use owner/name format"),
    });
    if (!repo) {
      return false;
    }
    repo = repo.trim();
  }

  const mode = await pickRepoMode(slashmd?.mode);
  if (!mode) {
    return false;
  }

  await writeWorkspaceSlashmd({
    repo,
    contentPath: suggestedPath,
    defaultBranch: suggestedBranch,
    mode,
    sections: slashmd?.sections,
  });
  await bindContentRepo(context, repo);
  await reloadSlashmdConfig({ contentRepo: repo });

  const modeLabel = mode === "personal" ? "Personal (direct Publish)" : "Workspace (Review → PR)";
  await vscode.window.showInformationMessage(
    `Slash MD ready: ${repo} (${suggestedPath} @ ${suggestedBranch}, ${modeLabel}). Config in .slashmd.json`,
  );
  return true;
}

async function pickRepoMode(existing: unknown): Promise<RepoMode | undefined> {
  const current = existing === "personal" || existing === "workspace" ? normalizeRepoMode(existing) : undefined;
  const picked = await vscode.window.showQuickPick(
    [
      {
        label: "Workspace",
        description: "Review opens a PR; Publish merges after approval",
        detail: "For shared docs repos with protected main",
        mode: "workspace" as const,
      },
      {
        label: "Personal",
        description: "Publish commits and pushes straight to the default branch",
        detail: "For solo docs — no PR per file",
        mode: "personal" as const,
      },
    ],
    {
      title: "Slash MD: Init — publish mode",
      placeHolder: current ? `Current: ${current}` : "How should docs reach GitHub?",
      ignoreFocusOut: true,
    },
  );
  return picked?.mode;
}
