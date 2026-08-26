/** Repo publish mode: workspace = PR review; personal = direct push; local = disk only. */
export const RepoMode = {
  Workspace: "workspace",
  Personal: "personal",
  Local: "local",
} as const;

export type RepoMode = (typeof RepoMode)[keyof typeof RepoMode];

export type SlashmdFile = {
  repo?: string;
  /**
   * Folder for wiki pages. Omit or use `"."` for the opened folder root.
   * Default when missing: repo / folder root.
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
  if (value === RepoMode.Personal) {
    return RepoMode.Personal;
  }
  if (value === RepoMode.Local) {
    return RepoMode.Local;
  }
  return RepoMode.Workspace;
}

/** GitHub-backed modes (need owner/name repo). */
export function isGithubMode(mode: RepoMode): boolean {
  return mode === RepoMode.Workspace || mode === RepoMode.Personal;
}

/** PR-review mode only (Inbox, Reviews, Publications). */
export function isWorkspaceMode(mode: RepoMode | undefined): boolean {
  return mode === RepoMode.Workspace;
}

export function parseOwnerName(repo: string): { owner: string; name: string } | undefined {
  const match = repo.trim().replace(/\.git$/i, "").match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) {
    return undefined;
  }
  return { owner: match[1], name: match[2] };
}
