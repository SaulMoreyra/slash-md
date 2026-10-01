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
  /** Local AI chat harness configuration (see `McpConfig`). */
  mcp?: McpConfig;
};

/** One local CLI agent the chat can drive. */
export type McpAgentConfig = {
  /** Preset name (`opencode`, `claude`, `codex`) or a binary on PATH / absolute path. */
  name: string;
  /** Extra args appended after the preset args (or used as-is for a raw command). */
  args?: string[];
  /** Extra environment variables. Credentials should come from the agent's own login. */
  env?: Record<string, string>;
};

/** `.slashmd.json` `mcp` block. `server` is reserved for the phase-2 tools server. */
export type McpConfig = {
  agent?: McpAgentConfig;
  server?: { enabled: boolean; port: number };
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
