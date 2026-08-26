import type { FrontmatterKey, WebviewToHost } from "@slash-md/core/protocol";

/** Mutable session state shared between provider shell and message router. */
export type EditorSessionState = {
  latestText: string;
  saveTimer: ReturnType<typeof setTimeout> | undefined;
  persisting: boolean;
};

/** Host-side operations invoked by the editor webview message router. */
export type EditorSessionDeps = {
  state: EditorSessionState;
  frontmatterKeys: ReadonlySet<FrontmatterKey>;
  applyEdit(bodyMarkdown: string): void;
  applyFrontmatter(field: FrontmatterKey, value: string): void;
  persistSoon(): void;
  uploadImage(msg: Extract<WebviewToHost, { type: "uploadImage" }>): Promise<void>;
  resolveImage(msg: Extract<WebviewToHost, { type: "resolveImage" }>): Promise<void>;
  openUrl(url: string): Promise<void>;
};
