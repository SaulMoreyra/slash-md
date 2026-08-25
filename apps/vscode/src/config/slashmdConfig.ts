import * as vscode from "vscode";
import { detectWorkspaceGit } from "./gitDetect";
import {
  normalizeRepoMode,
  type RepoMode,
  type SlashmdFile,
} from "@slash-md/core/configTypes";
import { contentPathPrefix, normalizeContentPathInput, posixJoin } from "@slash-md/core/paths";

export type { RepoMode, SlashmdFile };
export { normalizeRepoMode };

export const SLASHMD_FILENAME = ".slashmd.json";
const GLOBAL_REPO_KEY = "slashMd.contentRepo";

type Cache = {
  file: SlashmdFile;
  source?: string;
};

let cache: Cache = { file: {} };
let boundRepo: string | undefined;

export function getSlashmdFile(): SlashmdFile {
  return cache.file;
}

export function getBoundContentRepo(): string | undefined {
  return boundRepo?.trim() || undefined;
}

export function restoreBoundContentRepo(context: vscode.ExtensionContext): void {
  boundRepo = context.globalState.get<string>(GLOBAL_REPO_KEY)?.trim() || undefined;
}

export async function bindContentRepo(context: vscode.ExtensionContext, repo: string): Promise<void> {
  boundRepo = repo.trim();
  await context.globalState.update(GLOBAL_REPO_KEY, boundRepo);
}

export function getConfiguredSections(contentPath: string): string[] {
  const root = contentPathPrefix(contentPath);
  const raw = cache.file.sections ?? [];
  const out = new Set<string>();
  for (const section of raw) {
    const trimmed = section.trim().replace(/^\/+|\/+$/g, "");
    if (!trimmed || trimmed === ".") {
      if (root) {
        out.add(root);
      }
      continue;
    }
    if (!root || trimmed === root || trimmed.startsWith(`${root}/`)) {
      out.add(trimmed);
    } else {
      out.add(posixJoin(root, trimmed));
    }
  }
  return [...out].sort();
}

export async function reloadSlashmdConfig(opts?: {
  cloneDir?: vscode.Uri;
  contentRepo?: string;
}): Promise<SlashmdFile> {
  const fromWorkspace = await readFromWorkspace(opts?.contentRepo);
  if (fromWorkspace) {
    cache = fromWorkspace;
    return cache.file;
  }
  if (opts?.cloneDir) {
    const fromClone = await readJsonFile(vscode.Uri.joinPath(opts.cloneDir, SLASHMD_FILENAME));
    if (fromClone) {
      cache = { file: fromClone, source: opts.cloneDir.fsPath };
      return cache.file;
    }
  }
  cache = { file: {} };
  return cache.file;
}

export async function peekWorkspaceSlashmd(): Promise<SlashmdFile | undefined> {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!folder) {
    return undefined;
  }
  return readJsonFile(vscode.Uri.joinPath(folder, SLASHMD_FILENAME));
}

/** Write/merge `.slashmd.json` in the workspace root. Does not touch `.vscode/settings.json`. */
export async function writeWorkspaceSlashmd(patch: SlashmdFile): Promise<vscode.Uri> {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!folder) {
    throw new Error("Open a folder to save .slashmd.json.");
  }
  const uri = vscode.Uri.joinPath(folder, SLASHMD_FILENAME);
  const existing = (await readJsonFile(uri)) ?? {};
  const next: SlashmdFile = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(patch).filter(([key, value]) => {
        if (value === undefined) {
          return false;
        }
        // Allow empty / "." contentPath (repo root); other empty strings are omitted.
        if (key === "contentPath") {
          return true;
        }
        return value !== "";
      }),
    ),
  };
  if (patch.contentPath !== undefined) {
    next.contentPath = normalizeContentPathInput(patch.contentPath);
  }
  if (Array.isArray(patch.sections)) {
    next.sections = patch.sections;
  } else if (existing.sections) {
    next.sections = existing.sections;
  }
  const body = `${JSON.stringify(next, null, 2)}\n`;
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, "utf8"));
  cache = { file: normalizeFile(next as Record<string, unknown>), source: folder.fsPath };
  return uri;
}

async function readFromWorkspace(contentRepo?: string): Promise<Cache | undefined> {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!folder) {
    return undefined;
  }
  const file = await readJsonFile(vscode.Uri.joinPath(folder, SLASHMD_FILENAME));
  if (!file) {
    return undefined;
  }
  if (contentRepo) {
    const detected = await detectWorkspaceGit(folder);
    const fileRepo = file.repo?.trim();
    if (detected.repo && !equalsRepo(detected.repo, contentRepo) && (!fileRepo || !equalsRepo(fileRepo, contentRepo))) {
      return undefined;
    }
  }
  return { file, source: folder.fsPath };
}

async function readJsonFile(uri: vscode.Uri): Promise<SlashmdFile | undefined> {
  try {
    const raw = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    return normalizeFile(parsed as Record<string, unknown>);
  } catch {
    return undefined;
  }
}

function normalizeFile(raw: Record<string, unknown> | SlashmdFile): SlashmdFile {
  const out: SlashmdFile = {};
  const repo = typeof raw.repo === "string" ? raw.repo : undefined;
  if (repo && /^[^/\s]+\/[^/\s]+$/.test(repo.trim().replace(/\.git$/i, ""))) {
    out.repo = repo.trim().replace(/\.git$/i, "");
  }
  if (typeof raw.contentPath === "string") {
    out.contentPath = normalizeContentPathInput(raw.contentPath);
  }
  if (typeof raw.defaultBranch === "string" && raw.defaultBranch.trim()) {
    out.defaultBranch = raw.defaultBranch.trim();
  }
  if (raw.mode === "personal" || raw.mode === "workspace") {
    out.mode = raw.mode;
  }
  if (Array.isArray(raw.sections)) {
    out.sections = raw.sections.filter((s): s is string => typeof s === "string" && Boolean(s.trim()));
  }
  if (typeof raw.templatesPath === "string" && raw.templatesPath.trim()) {
    out.templatesPath = raw.templatesPath.trim().replace(/^\/+|\/+$/g, "");
  }
  return out;
}

function equalsRepo(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
