/** Pure Home tree / staging types shared by host and webview. */

export type LocalDraftBadge = "draft" | "modificado" | "in review";

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

export type LoteReviewSummary = {
  prNumber: number;
  prUrl: string;
  title: string;
  branch: string;
  reviewers: string[];
  checksOk: boolean | null;
  approvals: number;
  state: "open" | "merged" | "closed";
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
  /** Remote path to the index/portada file, if it exists. */
  indexPath?: string;
  /** Active lote PR summary when there are in_review pages with an open PR. */
  loteReview?: LoteReviewSummary;
};
