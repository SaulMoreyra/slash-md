import type { LocalDraftBadge } from "./homeTypes";

export type GitDraftState = { untracked: boolean; dirty: boolean; deleted?: boolean };

export function hasGitChanges(git: GitDraftState | undefined): boolean {
  return Boolean(git?.untracked || git?.dirty || git?.deleted);
}

/**
 * Pages in Cambios locales / Local changes: git dirty or untracked.
 * Committed `status: draft` (templates, unpublished copies) is not a local change.
 */
export function isLocalDraft(status: string, git: GitDraftState): boolean {
  if (status.trim().toLowerCase() === "published") {
    return false;
  }
  return hasGitChanges(git);
}

export function draftBadge(status: string, git: GitDraftState): LocalDraftBadge {
  if (git.deleted) {
    return "eliminado";
  }
  const kind = status.trim().toLowerCase();
  if (kind === "in_review") {
    return git.dirty ? "modificado" : "in review";
  }
  if (kind === "draft" || (!kind && git.untracked)) {
    return "draft";
  }
  return "modificado";
}

export type DiscardLocalChangeAction = "delete" | "restore" | "none";

export function discardLocalChangeAction(git: GitDraftState | undefined): DiscardLocalChangeAction {
  if (git?.deleted) {
    return "restore";
  }
  if (git?.untracked) {
    return "delete";
  }
  if (git?.dirty) {
    return "restore";
  }
  return "none";
}
