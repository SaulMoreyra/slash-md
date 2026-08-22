import * as vscode from "vscode";
import {
  getBoundContentRepo,
  getSlashmdFile,
  normalizeRepoMode,
  type RepoMode,
} from "../slashmdConfig";

export type ContentConfig = {
  repo: string;
  owner: string;
  name: string;
  contentPath: string;
  defaultBranch: string;
  /** From .slashmd.json; missing → workspace. */
  mode: RepoMode;
};

export function getContentConfig(): ContentConfig | undefined {
  const cfg = vscode.workspace.getConfiguration("slash-md");
  const file = getSlashmdFile();
  // Prefer .slashmd.json, then extension globalState (Init), then optional settings (read-only legacy).
  const repo = (
    file.repo?.trim() ||
    getBoundContentRepo() ||
    cfg.get<string>("contentRepo")?.trim() ||
    ""
  ).trim();
  if (!repo) {
    return undefined;
  }
  const parsed = parseOwnerName(repo);
  if (!parsed) {
    return undefined;
  }
  const contentPath = trimSlashes(
    file.contentPath?.trim() || cfg.get<string>("contentPath")?.trim() || "docs",
  );
  const defaultBranch =
    file.defaultBranch?.trim() || cfg.get<string>("defaultBranch")?.trim() || "main";
  return {
    repo,
    owner: parsed.owner,
    name: parsed.name,
    contentPath,
    defaultBranch,
    mode: normalizeRepoMode(file.mode),
  };
}

export function parseOwnerName(repo: string): { owner: string; name: string } | undefined {
  const match = repo.trim().replace(/\.git$/i, "").match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) {
    return undefined;
  }
  return { owner: match[1], name: match[2] };
}

export function githubHttpsUrl(owner: string, name: string): string {
  return `https://github.com/${owner}/${name}.git`;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}
