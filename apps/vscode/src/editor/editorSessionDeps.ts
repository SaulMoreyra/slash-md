import type { FrontmatterKey, PageKind, WebviewToHost, Workflow } from "@slash-md/core/protocol";

/** Mutable session state shared between provider shell and message router. */
export type EditorSessionState = {
  latestText: string;
  saveTimer: ReturnType<typeof setTimeout> | undefined;
  reviewing: boolean;
  persisting: boolean;
};

/** Host-side operations invoked by the editor webview message router. */
export type EditorSessionDeps = {
  state: EditorSessionState;
  workflow: Workflow;
  pageKind: PageKind;
  /** Editable frontmatter keys from the UI. */
  frontmatterKeys: ReadonlySet<FrontmatterKey>;
  applyEdit(bodyMarkdown: string): void;
  applyFrontmatter(field: FrontmatterKey, value: string): void;
  persistSoon(): void;
  flushSaveTimer(): void;
  persistNow(): Promise<void>;
  refreshThreads(): Promise<void>;
  threadReply(threadId: string, body: string): Promise<void>;
  threadResolve(threadId: string, resolved: boolean): Promise<void>;
  threadCreate(selectedText: string): Promise<void>;
  uploadImage(msg: Extract<WebviewToHost, { type: "uploadImage" }>): Promise<void>;
  resolveImage(msg: Extract<WebviewToHost, { type: "resolveImage" }>): Promise<void>;
  reviewOrPublish(kind: "review" | "publish"): Promise<void>;
  openUrl(url: string): Promise<void>;
  refreshLabels(): void;
};
