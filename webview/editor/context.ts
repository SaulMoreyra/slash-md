import type { CrepeBuilder } from "@milkdown/crepe/builder";
import type { ReviewThread, WebviewBoot, WebviewToHost } from "../../src/domain/protocol";
import { normalizeMarkdown } from "../../src/domain/markdown";
import type { ReviewContextHandle } from "./chrome/reviewContext";
import type { CommentsHandle } from "./threads/commentsMount";
import type { ThreadChromeHandle } from "./threads/threadChrome";
import type { BarHandle } from "./chrome/bar";
import type { EditorChromeHandles } from "./messaging/router";
import type { VsCodeApi } from "./vscode";

export type PendingReveal = {
  snippet: string;
  threadId?: string;
};

export type PendingImage = {
  resolve: (src: string) => void;
  reject: (err: Error) => void;
};

export type EditorState = {
  crepe?: CrepeBuilder;
  comments?: CommentsHandle;
  lastSent: string;
  applyingExternal: boolean;
  imageMap: Record<string, string>;
  pendingImages: Map<string, PendingImage>;
  latestThreads: ReviewThread[];
  canWriteThreads: boolean;
  pendingReveal?: PendingReveal;
};

export type EditorTimers = {
  save?: ReturnType<typeof setTimeout>;
  reveal?: ReturnType<typeof setTimeout>;
};

export type EditorHandles = {
  bar: BarHandle;
  chrome: ThreadChromeHandle;
  reviewContext: ReviewContextHandle;
  pageChrome: EditorChromeHandles;
};

export type EditorContext = {
  vscode: VsCodeApi;
  boot: WebviewBoot;
  canvas: HTMLElement;
  wantComments: boolean;
  state: EditorState;
  handles: EditorHandles;
  timers: EditorTimers;
  post: (message: WebviewToHost) => void;
};

export function readBoot(): WebviewBoot {
  return (window as unknown as Window & { __SLASH_MD__: WebviewBoot }).__SLASH_MD__;
}

export function createEditorState(boot: WebviewBoot): EditorState {
  return {
    lastSent: normalizeMarkdown(boot.text),
    applyingExternal: false,
    imageMap: { ...(boot.imageMap ?? {}) },
    pendingImages: new Map(),
    latestThreads: [],
    canWriteThreads: false,
  };
}

export function wantCommentsForBoot(boot: WebviewBoot): boolean {
  return boot.init.workflow === "workspace" && (boot.init.repoMode ?? "workspace") === "workspace";
}
