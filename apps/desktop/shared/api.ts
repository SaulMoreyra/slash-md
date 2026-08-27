import type { ContentConfig, SlashmdFile } from "@slash-md/core/configTypes";
import type {
  HomeTreePayload,
  HomeTreeNode,
  PublicationState,
  PublicationSummary,
  WikiSyncState,
  ConflictFile,
} from "@slash-md/core/homeTypes";
import type { ReviewPreviewItem } from "@slash-md/core/homeProtocol";
import type { FrontmatterFields, ReviewThread } from "@slash-md/core/protocol";
import type { TemplatePick } from "@slash-md/core/templates";
import type { ConflictChoice } from "@slash-md/core/conflictModel";
import type { MenuAction } from "./menu";

export type { ConflictChoice } from "@slash-md/core/conflictModel";
export type { MenuAction } from "./menu";

export type AuthInfo = { login: string } | null;

/** Whether `gh` is on PATH (or a known macOS path) and already logged in. */
export type GhCliProbe = {
  available: boolean;
  login: string | null;
};

export type AppTheme = "light" | "dark";

export type WorkspaceInfo = {
  root: string | null;
  config: ContentConfig | null;
  slashmd: SlashmdFile;
  needsInit: boolean;
  auth: AuthInfo;
  theme: AppTheme;
};

/** Cheap HEAD snapshot — not the mounted publication. */
export type GitSnapshot = {
  branch: string | null;
};

export type PagePayload = {
  path: string;
  markdown: string;
  frontmatter: FrontmatterFields;
  savedAt: string | null;
  pageKind: "wiki" | "editor";
  repoMode: ContentConfig["mode"];
  publishEnabled: boolean;
  /** Local draft (or dirty in_review) that can join a Mandar a Revisión lote. */
  reviewable: boolean;
  prUrl: string | null;
  /** Mounted publication when HEAD is a pub/ branch (workspace). */
  publication?: PublicationState | null;
  /** False on workspace default branch (wiki read-only). */
  canWrite?: boolean;
  /** Checked-out git branch (HEAD), when the folder is a repo. */
  branch?: string;
};

export type ReviewBatchResult = {
  prNumber: number;
  prUrl: string;
  created: boolean;
  branch: string;
  paths: string[];
  /** Logins that could not be requested as reviewers (mentioned in PR body). */
  mentionedOnly?: string[];
};

export type PublishBatchResult = {
  prNumber: number;
  prUrl: string;
  paths: string[];
  alreadyMerged: boolean;
};

export type ThreadsPayload = {
  threads: ReviewThread[];
  prUrl: string | null;
  canWrite: boolean;
  headOid: string | null;
};

export type DesktopApi = {
  pickFolder(): Promise<string | undefined>;
  openFolder(path: string): Promise<WorkspaceInfo>;
  closeFolder(): Promise<WorkspaceInfo>;
  /** Ensure path exists and is a directory; returns the trimmed path. */
  assertDirectory(path: string): Promise<string>;
  /** Resolve a dropped File to an absolute directory path (Electron). */
  resolveDroppedFolder(file: File): Promise<string>;
  getWorkspace(): Promise<WorkspaceInfo>;
  gitStatus(): Promise<GitSnapshot>;
  homeTree(): Promise<HomeTreePayload>;
  openPage(path: string): Promise<PagePayload>;
  savePage(path: string, markdown: string): Promise<{ savedAt: string }>;
  patchFrontmatter(path: string, patch: Partial<FrontmatterFields>): Promise<{ markdown: string }>;
  newPage(input: {
    title: string;
    templateId: string;
    section?: string;
    fileName?: string;
  }): Promise<{ path: string }>;
  newFolder(input: { name: string; parent?: string }): Promise<{ path: string }>;
  renamePage(path: string, title: string): Promise<{ path: string }>;
  deletePage(path: string): Promise<void>;
  renameFolder(path: string, name: string): Promise<{ path: string }>;
  deleteFolder(path: string): Promise<void>;
  discardDraft(path: string): Promise<{ deleted: boolean }>;
  setDraftSelection(paths: string[]): Promise<void>;
  previewReview(): Promise<ReviewPreviewItem[]>;
  reviewBatch(reviewers?: string, excludePaths?: string[]): Promise<ReviewBatchResult>;
  publishBatch(preferredPr?: number): Promise<PublishBatchResult>;
  publishPersonal(paths: string | string[]): Promise<{ url: string }>;
  createPublication(title: string): Promise<PublicationState>;
  resumePublication(branch: string): Promise<PublicationState>;
  leavePublication(): Promise<void>;
  landPublication(branch?: string): Promise<void>;
  discardPublication(branch: string): Promise<void>;
  listPublications(): Promise<PublicationSummary[]>;
  getConflictState(): Promise<WikiSyncState>;
  syncWithWiki(): Promise<WikiSyncState>;
  resolveConflict(path: string, choice: ConflictChoice): Promise<WikiSyncState>;
  abortSyncWithWiki(): Promise<WikiSyncState>;
  finishSyncWithWiki(): Promise<WikiSyncState>;
  signIn(token?: string): Promise<AuthInfo>;
  probeGhAuth(): Promise<GhCliProbe>;
  signOut(): Promise<void>;
  getConfig(): Promise<SlashmdFile>;
  saveConfig(config: SlashmdFile): Promise<void>;
  initWorkspace(config: SlashmdFile): Promise<void>;
  listTemplates(): Promise<TemplatePick[]>;
  detectGit(): Promise<{ repo?: string; branch: string; hasDocsDir: boolean }>;
  uploadImage(pagePath: string, name: string, bytes: Uint8Array): Promise<{ src: string; dataUrl: string }>;
  resolveImages(pagePath: string, markdown: string): Promise<Record<string, string>>;
  loadThreads(pagePath: string): Promise<ThreadsPayload>;
  threadReply(pagePath: string, threadId: string, body: string): Promise<void>;
  threadResolve(pagePath: string, threadId: string, resolved: boolean): Promise<void>;
  threadCreate(pagePath: string, selectedText: string, body: string): Promise<void>;
  openUrl(url: string): Promise<void>;
  setTheme(theme: AppTheme): Promise<void>;
  onTheme(listener: (theme: AppTheme) => void): () => void;
  onFolderOpened(listener: (folder: string) => void): () => void;
  onMenuAction(listener: (action: MenuAction) => void): () => void;
};

export type {
  ContentConfig,
  SlashmdFile,
  HomeTreePayload,
  HomeTreeNode,
  ReviewPreviewItem,
  FrontmatterFields,
  ReviewThread,
  TemplatePick,
  PublicationState,
  PublicationSummary,
  WikiSyncState,
  ConflictFile,
};
