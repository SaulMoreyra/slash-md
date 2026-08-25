import type { ContentConfig, SlashmdFile } from "@slash-md/core/configTypes";
import type { HomeTreePayload, HomeTreeNode } from "@slash-md/core/homeTypes";
import type { ReviewPreviewItem } from "@slash-md/core/homeProtocol";
import type { FrontmatterFields, ReviewThread } from "@slash-md/core/protocol";
import type { TemplatePick } from "@slash-md/core/templates";

export type AuthInfo = { login: string } | null;

export type WorkspaceInfo = {
  root: string | null;
  config: ContentConfig | null;
  slashmd: SlashmdFile;
  needsInit: boolean;
  auth: AuthInfo;
  theme: "light" | "dark";
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
};

export type ReviewBatchResult = {
  prNumber: number;
  prUrl: string;
  created: boolean;
  branch: string;
  paths: string[];
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
  getWorkspace(): Promise<WorkspaceInfo>;
  homeTree(): Promise<HomeTreePayload>;
  openPage(path: string): Promise<PagePayload>;
  savePage(path: string, markdown: string): Promise<{ savedAt: string }>;
  patchFrontmatter(path: string, patch: Partial<FrontmatterFields>): Promise<{ markdown: string }>;
  newPage(input: { title: string; templateId: string; section?: string }): Promise<{ path: string }>;
  newFolder(input: { name: string; parent?: string }): Promise<{ path: string }>;
  renamePage(path: string, title: string): Promise<{ path: string }>;
  deletePage(path: string): Promise<void>;
  setDraftSelection(paths: string[]): Promise<void>;
  previewReview(): Promise<ReviewPreviewItem[]>;
  reviewBatch(reviewers?: string): Promise<ReviewBatchResult>;
  publishBatch(preferredPr?: number): Promise<PublishBatchResult>;
  publishPersonal(path: string): Promise<{ url: string }>;
  signIn(token?: string): Promise<AuthInfo>;
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
  onTheme(listener: (theme: "light" | "dark") => void): () => void;
};

export type { ContentConfig, SlashmdFile, HomeTreePayload, HomeTreeNode, ReviewPreviewItem, FrontmatterFields, ReviewThread, TemplatePick };
