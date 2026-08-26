import type { RepoMode } from "./configTypes";

export type BarKind = "draft" | "ahead" | "error" | "in_review" | "published";

/** Workspace = drafts + Review/Publish; Editor = in-place .md without GitHub. */
export type Workflow = "workspace" | "editor";

/** Wiki = real `.md` in the docs repo; Sidecar = legacy `.slash.md`; Editor = loose `.md`. */
export type PageKind = "wiki" | "sidecar" | "editor";

export type { RepoMode };

export type FrontmatterKey =
  | "title"
  | "owner"
  | "status"
  | "updated"
  | "icon"
  | "cover"
  | "coverPosition"
  | "pr"
  | "reviewBranch"
  | "tags"
  | "people";

export type FrontmatterFields = {
  title: string;
  owner: string;
  status: string;
  updated: string;
  icon: string;
  cover: string;
  coverPosition: string;
  pr: string;
  reviewBranch: string;
  tags: string;
  people: string;
};

export type FileEditor = {
  id: string;
  name: string;
  email: string;
  login: string | null;
  avatarUrl: string | null;
  lastEditedAt: string;
  commits: number;
};

export type FileEditorsPayload = {
  editors: FileEditor[];
  lastEditedAt: string | null;
  createdAt: string | null;
  createdBy: string | null;
  you: FileEditor | null;
};

/** PR review thread painted on the canvas (8a+). */
export type ReviewThreadComment = {
  id: string;
  /** REST numeric id for replies (`in_reply_to`). */
  databaseId: number | null;
  body: string;
  author: string;
  /** GitHub avatar URL when available. */
  avatarUrl: string | null;
  url: string;
  createdAt: string;
};

export type ReviewThread = {
  id: string;
  isResolved: boolean;
  path: string;
  line: number | null;
  startLine: number | null;
  diffSide: "LEFT" | "RIGHT" | null;
  snippet: string;
  url: string;
  comments: ReviewThreadComment[];
};

export type HostToWebview =
  | {
      type: "init";
      title: string;
      path: string;
      savedAt: string | null;
      kind: BarKind;
      label: string;
      publishEnabled: boolean;
      prUrl?: string | null;
      workflow: Workflow;
      repoMode?: RepoMode;
      pageKind?: PageKind;
    }
  | { type: "setText"; text: string }
  | { type: "saved"; at: string; title?: string }
  | {
      type: "status";
      kind: BarKind;
      label: string;
      publishEnabled: boolean;
      prUrl?: string | null;
      path?: string;
      workflow?: Workflow;
      repoMode?: RepoMode;
      pageKind?: PageKind;
    }
  | { type: "frontmatter"; fields: FrontmatterFields }
  | { type: "imageUploaded"; id: string; src: string; webviewUri: string }
  | { type: "imageResolved"; id: string; src: string; webviewUri?: string }
  | { type: "imageMap"; map: Record<string, string> }
  | { type: "threads"; threads: ReviewThread[]; prUrl?: string | null; canWrite?: boolean }
  | { type: "revealThread"; snippet: string; threadId?: string }
  | {
      type: "reviewContext";
      mismatch: boolean;
      prNumber: number;
      prUrl: string;
      localBranch?: string;
      reviewBranch?: string;
      reason?: "pr" | "branch" | "missing";
      message?: string;
    }
  | ({ type: "editors" } & FileEditorsPayload);

export type WebviewToHost =
  | { type: "edit"; text: string }
  | { type: "review"; text?: string }
  | { type: "publish"; text?: string }
  | { type: "openUrl"; url: string }
  | { type: "frontmatter"; field: FrontmatterKey; value: string }
  | { type: "uploadImage"; id: string; name: string; mime: string; data: string }
  | { type: "resolveImage"; id: string; src: string }
  | { type: "threadsRefresh" }
  | { type: "threadReply"; threadId: string; body: string }
  | { type: "threadResolve"; threadId: string; resolved: boolean }
  | { type: "threadCreate"; selectedText: string };

export type WebviewBoot = {
  init: Extract<HostToWebview, { type: "init" }>;
  text: string;
  frontmatter: FrontmatterFields;
  imageMap: Record<string, string>;
};
