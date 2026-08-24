import type { SlashmdFile } from "../config/slashmdConfig";
import type { HomeToWebview, ReviewPreviewItem } from "../domain/homeProtocol";

/** Host-side operations invoked by the Home webview message router. */
export type HomePanelDeps = {
  pushTree(): Promise<void>;
  refresh(): Promise<void>;
  invalidateInboxAndPushTree(): Promise<void>;
  openDoc(path: string): Promise<void>;
  renameDoc(path: string): Promise<void>;
  deleteDoc(path: string): Promise<void>;
  createNew(section?: string): Promise<void>;
  createFolder(parent?: string): Promise<void>;
  runWorkspaceInit(): Promise<void>;
  signInGithub(): Promise<void>;
  toggleDraft(path: string): Promise<void>;
  selectAllDrafts(): Promise<void>;
  setDraftSelection(paths: string[]): Promise<void>;
  previewReview(): Promise<void>;
  reviewBatch(): Promise<void>;
  publishBatch(): Promise<void>;
  openInbox(item: {
    path: string;
    prNumber: number;
    threadId: string;
    prUrl?: string;
    snippet?: string;
    line?: number | null;
    startLine?: number | null;
  }): Promise<void>;
  getConfig(): Promise<void>;
  saveConfig(config: SlashmdFile): Promise<void>;
  renameFolder(path: string): Promise<void>;
  openIndex(): Promise<void>;
  createIndex(): Promise<void>;
  postReviewPreview(items: ReviewPreviewItem[]): Promise<void>;
};

export type HomePanelPost = (message: HomeToWebview) => Promise<void>;
