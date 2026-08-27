/** Pure Home tree / staging types shared by host and webview. */

import type { ConflictFileKind, WikiSyncStatus } from "./conflictModel";

export type { ConflictFileKind, WikiSyncStatus } from "./conflictModel";

export type LocalDraftBadge = "draft" | "modificado" | "in review" | "eliminado";

export type LocalDraft = {
  path: string;
  title: string;
  badge: LocalDraftBadge;
};

export type InReviewPage = {
  path: string;
  title: string;
  pr: number;
  status: "in_review";
  reviewBranch?: string;
};

export type InboxItem = {
  prNumber: number;
  prUrl: string;
  path: string;
  threadId: string;
  excerpt: string;
  author: string;
  createdAt: string;
  snippet?: string;
  line?: number | null;
  startLine?: number | null;
};

export type HomeTreeNode = {
  kind: "folder" | "file";
  path: string;
  title: string;
  badge?: string;
  children?: HomeTreeNode[];
};

export type PublicationCommenter = {
  login: string;
  avatarUrl?: string;
};

export type LoteReviewSummary = {
  prNumber: number;
  prUrl: string;
  title: string;
  branch: string;
  reviewers: string[];
  /** Requested reviewers and people who already left a review, with avatars when known. */
  reviewerPeople?: PublicationCommenter[];
  checksOk: boolean | null;
  approvals: number;
  state: "open" | "merged" | "closed";
  wikiSyncStatus?: WikiSyncStatus;
};

/** Lifecycle of a workspace publication (branch + optional PR). */
export type PublicationKind = "draft" | "in_review" | "published";

export type PublicationState = {
  title: string;
  branch: string;
  prNumber?: number;
  prUrl?: string;
  kind: PublicationKind;
};

export type PublicationSummary = {
  title: string;
  branch: string;
  prNumber?: number;
  prUrl?: string;
  kind: PublicationKind;
  /** True when this branch is currently checked out. */
  mounted: boolean;
  /** Open PR author, when known. */
  author?: string;
  /** In review: latest reviews include an approval (and no changes requested). */
  approved?: boolean;
  /** In review: unique people who left a comment on the pull. */
  commenters?: PublicationCommenter[];
  /** Draft: files changed vs the wiki default branch. */
  changedFiles?: number;
  /** Draft: lines added vs the wiki default branch. */
  additions?: number;
  /** Draft: lines removed vs the wiki default branch. */
  deletions?: number;
};

export type HomeTreePayload = {
  repo: string;
  contentPath: string;
  needsAuth: boolean;
  needsInit: boolean;
  /** Tree came from the open workspace folder (no GitHub needed). */
  fromWorkspace: boolean;
  roots: HomeTreeNode[];
  drafts: LocalDraft[];
  selected: string[];
  inbox: InboxItem[];
  inboxError?: string;
  /** Local in_review + pr, so Home can enable Aprobar y Publicar. */
  canPublishBatch: boolean;
  /** Uncommitted or unpushed markdown on the mounted publication. */
  canSendReview?: boolean;
  /** Remote path to the index/portada file, if it exists. */
  indexPath?: string;
  /** Active lote PR summary when there are in_review pages with an open PR. */
  loteReview?: LoteReviewSummary;
  /** Mounted publication when HEAD is a pub/ branch (workspace). */
  publication?: PublicationState | null;
  /** Workspace can write only when a publication is mounted. */
  canWrite?: boolean;
  /** Known publications (local/remote pub/ branches + open PRs). */
  publications?: PublicationSummary[];
  /** Checked-out git branch (HEAD), when the folder is a repo. */
  branch?: string;
  /** Wiki vs this publication: behind / conflicting (GitHub) or local merge in progress. */
  wikiSyncStatus?: WikiSyncStatus;
};

export type ConflictFile = {
  path: string;
  title: string;
  kind: ConflictFileKind;
  oursMarkdown: string | null;
  theirsMarkdown: string | null;
};

export type WikiSyncState = {
  status: WikiSyncStatus;
  files: ConflictFile[];
};
