import type { PublicationCommenter } from "./homeTypes";

export type GitDiffStats = {
  changedFiles: number;
  additions: number;
  deletions: number;
};

/** Parse `git diff --shortstat` (empty stdout is a zero diff). */
export function parseGitShortstat(stdout: string): GitDiffStats | undefined {
  const line = stdout.trim();
  if (!line) {
    return { changedFiles: 0, additions: 0, deletions: 0 };
  }
  const files = line.match(/(\d+)\s+files? changed/);
  if (!files) {
    return undefined;
  }
  const insertions = line.match(/(\d+)\s+insertions?\(\+\)/);
  const deletions = line.match(/(\d+)\s+deletions?\(-\)/);
  return {
    changedFiles: Number(files[1]),
    additions: insertions ? Number(insertions[1]) : 0,
    deletions: deletions ? Number(deletions[1]) : 0,
  };
}

export function commenterFromGithubUser(
  user?: { login?: string | null; avatar_url?: string | null } | null,
): PublicationCommenter | null {
  if (!user) {
    return null;
  }
  const login = user.login?.trim();
  if (!login) {
    return null;
  }
  const avatarUrl = user.avatar_url?.trim();
  return avatarUrl ? { login, avatarUrl } : { login };
}

export function uniqueCommenters(
  users: Array<PublicationCommenter | null | undefined>,
): PublicationCommenter[] {
  const byLogin = new Map<string, PublicationCommenter>();
  for (const user of users) {
    if (!user) {
      continue;
    }
    const login = user.login.trim();
    if (!login) {
      continue;
    }
    const key = login.toLowerCase();
    const avatarUrl = user.avatarUrl?.trim();
    const existing = byLogin.get(key);
    if (!existing) {
      byLogin.set(key, avatarUrl ? { login, avatarUrl } : { login });
      continue;
    }
    if (!existing.avatarUrl && avatarUrl) {
      existing.avatarUrl = avatarUrl;
    }
  }
  return [...byLogin.values()];
}
