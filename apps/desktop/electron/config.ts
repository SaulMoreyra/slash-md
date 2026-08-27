import fs from "node:fs/promises";
import path from "node:path";
import { RepoMode, type ContentConfig, type SlashmdFile, normalizeRepoMode, parseOwnerName } from "@slash-md/core/configTypes";
import { contentPathPrefix, normalizeContentPathInput } from "@slash-md/core/paths";
import { parseSlashmd } from "@slash-md/core/slashmd";
import { getWorkspaceRoot } from "./session";

export { parseSlashmd };

export const SLASHMD_FILENAME = ".slashmd.json";

export function repoFile(root: string, repoPath: string): string {
  return path.join(root, ...repoPath.split("/").filter(Boolean));
}

export async function fileExists(abs: string): Promise<boolean> {
  try {
    const stat = await fs.stat(abs);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function dirExists(abs: string): Promise<boolean> {
  try {
    const stat = await fs.stat(abs);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function readText(abs: string): Promise<string> {
  return fs.readFile(abs, "utf8");
}

export async function writeText(abs: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, text, "utf8");
}

export async function readSlashmd(root: string): Promise<SlashmdFile> {
  try {
    const raw = JSON.parse(await readText(path.join(root, SLASHMD_FILENAME))) as unknown;
    return parseSlashmd(raw);
  } catch {
    return {};
  }
}

export async function writeSlashmd(root: string, patch: SlashmdFile): Promise<SlashmdFile> {
  const existing = await readSlashmd(root);
  const next: SlashmdFile = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(patch).filter(([key, value]) => {
        if (value === undefined) {
          return false;
        }
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
  }
  if (next.mode === RepoMode.Local) {
    delete next.repo;
  }
  await writeText(path.join(root, SLASHMD_FILENAME), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export async function getContentConfig(root?: string | null): Promise<ContentConfig | undefined> {
  const workspace = root ?? getWorkspaceRoot();
  if (!workspace) {
    return undefined;
  }
  const file = await readSlashmd(workspace);
  const mode = normalizeRepoMode(file.mode);
  const contentPath = contentPathPrefix(normalizeContentPathInput(file.contentPath ?? "."));
  const defaultBranch = file.defaultBranch?.trim() || "main";

  if (mode === RepoMode.Local) {
    // Local-only: .slashmd.json with mode local (no GitHub repo required).
    return {
      repo: "",
      owner: "local",
      name: "docs",
      contentPath,
      defaultBranch,
      mode: RepoMode.Local,
    };
  }

  const repo = file.repo?.trim();
  if (!repo) {
    return undefined;
  }
  const parsed = parseOwnerName(repo);
  if (!parsed) {
    return undefined;
  }
  return {
    repo,
    owner: parsed.owner,
    name: parsed.name,
    contentPath,
    defaultBranch,
    mode,
  };
}

export function configuredSections(file: SlashmdFile, contentPath: string): string[] {
  const root = contentPathPrefix(contentPath);
  const out = new Set<string>();
  for (const section of file.sections ?? []) {
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
      out.add(`${root}/${trimmed}`);
    }
  }
  return [...out].sort();
}

export function assertSafeRepoPath(config: ContentConfig, repoPath: string): string {
  const normalized = repoPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.startsWith(".git/")) {
    throw new Error("Invalid document path.");
  }
  if (!normalized.endsWith(".md") || normalized.endsWith(".slash.md")) {
    throw new Error("Document must be a .md in the docs repo.");
  }
  const root = config.contentPath;
  if (root && normalized !== root && !normalized.startsWith(`${root}/`)) {
    throw new Error(`Document must live under ${root}/.`);
  }
  return normalized;
}

export function parseGithubRepo(remoteUrl: string): string | undefined {
  const cleaned = remoteUrl.trim().replace(/\.git$/i, "");
  const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/\s]+)$/i);
  if (!match) {
    return undefined;
  }
  return `${match[1]}/${match[2]}`;
}

export async function detectGit(root: string): Promise<{ repo?: string; branch: string; hasDocsDir: boolean }> {
  let repo: string | undefined;
  let branch = "main";
  try {
    const raw = await readText(path.join(root, ".git", "config"));
    const block = raw.match(/\[remote "origin"\]([\s\S]*?)(?:\[|$)/);
    const url = block?.[1]?.match(/url\s*=\s*(.+)/)?.[1]?.trim();
    repo = url ? parseGithubRepo(url) : undefined;
  } catch {
    // not a git folder, or no origin
  }
  try {
    const head = await readText(path.join(root, ".git", "HEAD"));
    const ref = head.match(/^ref:\s*refs\/heads\/(.+)$/m);
    if (ref?.[1]) {
      branch = ref[1].trim();
    }
  } catch {
    // keep default
  }
  return { repo, branch, hasDocsDir: await dirExists(path.join(root, "docs")) };
}
