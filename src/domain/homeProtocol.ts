import type { SlashmdFile } from "../config/slashmdConfig";
import type { HomeTreePayload } from "../home/homeTree";

/** Staging preview row shown before Mandar a Revisión. */
export type ReviewPreviewItem = {
  path: string;
  title: string;
  badge: string;
  summary: string;
};

/** Host → Home webview. Symmetric to HostToWebview in protocol.ts. */
export type HomeToWebview =
  | { type: "tree"; payload: HomeTreePayload }
  | { type: "status"; message: string }
  | { type: "configResult"; config: SlashmdFile; ok?: boolean; error?: string }
  | { type: "reviewPreview"; items: ReviewPreviewItem[] };

/** Home webview → Host. Symmetric to WebviewToHost in protocol.ts. */
export type HomeFromWebview =
  | { type: "ready" }
  | { type: "refresh" }
  | { type: "open"; path: string }
  | { type: "rename"; path: string }
  | { type: "delete"; path: string }
  | { type: "new"; section?: string }
  | { type: "newFolder"; parent?: string }
  | { type: "init" }
  | { type: "signIn" }
  | { type: "toggleDraft"; path: string }
  | { type: "selectAllDrafts" }
  | { type: "setDraftSelection"; paths: string[] }
  | { type: "previewReview" }
  | { type: "reviewBatch" }
  | { type: "publishBatch" }
  | {
      type: "openInbox";
      path: string;
      prNumber: number;
      threadId: string;
      prUrl?: string;
      snippet?: string;
      line?: number | null;
      startLine?: number | null;
    }
  | { type: "getConfig" }
  | { type: "saveConfig"; config: SlashmdFile }
  | { type: "renameFolder"; path: string }
  | { type: "openIndex" }
  | { type: "createIndex" };
