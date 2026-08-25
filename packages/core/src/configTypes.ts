/** Repo publish mode: workspace = PR review; personal = direct push. */
export type RepoMode = "workspace" | "personal";

export type SlashmdFile = {
  repo?: string;
  /**
   * Folder for wiki pages. Use `"."` (or omit path segments) for the repo root.
   * Default when missing: `docs`.
   */
  contentPath?: string;
  defaultBranch?: string;
  mode?: RepoMode;
  sections?: string[];
  /** Repo-relative folder for team `.md` templates (default: `<contentPath>/_templates`). */
  templatesPath?: string;
};

/** Resolved repo config used by hosts (VS Code / Electron). */
export type ContentConfig = {
  repo: string;
  owner: string;
  name: string;
  /** Runtime folder prefix; `""` means the repo root (`contentPath: "."` in .slashmd.json). */
  contentPath: string;
  defaultBranch: string;
  mode: RepoMode;
};

export function normalizeRepoMode(value: unknown): RepoMode {
  return value === "personal" ? "personal" : "workspace";
}

export function parseOwnerName(repo: string): { owner: string; name: string } | undefined {
  const match = repo.trim().replace(/\.git$/i, "").match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) {
    return undefined;
  }
  return { owner: match[1], name: match[2] };
}
