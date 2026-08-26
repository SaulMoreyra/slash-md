import type { HostToWebview } from "@slash-md/core/protocol";
import { normalizeMarkdown } from "@slash-md/core/markdown";
import { mountBar } from "./chrome/bar";
import { mountEdited } from "./chrome/edited";
import { mountFrontmatter } from "./chrome/frontmatter";
import { mountReviewContext } from "./chrome/reviewContext";
import type { EditorContext } from "./context";
import { createEditorState, readBoot, wantCommentsForBoot } from "./context";
import { createSlashCrepe } from "./core/crepe";
import { proxyImage, uploadImage } from "./core/images";
import { flushPendingSave, flushMarkdown, scheduleSave } from "./core/save";
import { mountCover } from "./hero/cover";
import { mountIcon } from "./hero/icon";
import { routeEditorHostMessage } from "./messaging/router";
import { mountComments } from "./threads/commentsMount";
import { revealThreadInEditor } from "./threads/reveal";
import { mountThreadChrome } from "./threads/threadChrome";
import type { HostBridge } from "./vscode";
import { createVsCodeBridge } from "./vscode";

export function createEditorContext(bridge: HostBridge = createVsCodeBridge()): EditorContext {
  const boot = readBoot();
  const canvas = document.getElementById("canvas");
  if (!canvas) {
    throw new Error("slash-md: missing #canvas");
  }

  const state = createEditorState(boot);
  const wantComments = wantCommentsForBoot(boot);

  const ctx: EditorContext = {
    vscode: bridge,
    boot,
    canvas,
    wantComments,
    state,
    handles: {} as EditorContext["handles"],
    timers: {},
    post: (message) => bridge.postMessage(message),
  };

  const bar = mountBar(bridge, boot.init, () => flushMarkdown(ctx));
  const frontmatter = mountFrontmatter(bridge, boot.frontmatter);
  const icon = mountIcon({ vscode: bridge }, boot.frontmatter);
  const edited = mountEdited();
  const cover = mountCover(
    {
      vscode: bridge,
      imageMap: ctx.state.imageMap,
      uploadImage: (file) => uploadImage(ctx, file),
      resolveImage: (src) => proxyImage(ctx, src),
    },
    boot.frontmatter,
  );

  ctx.handles.bar = bar;
  ctx.handles.chrome = mountThreadChrome(bridge);
  ctx.handles.reviewContext = mountReviewContext(bridge);
  ctx.handles.pageChrome = { bar, frontmatter, icon, cover, edited };

  return ctx;
}

export async function startEditor(ctx: EditorContext): Promise<void> {
  ctx.state.crepe = await createSlashCrepe({
    root: ctx.canvas,
    markdown: ctx.boot.text,
    onUpload: (file) => uploadImage(ctx, file),
    proxyDomURL: (url) => proxyImage(ctx, url),
    comments: ctx.wantComments,
    onCommentSelection: ctx.wantComments
      ? (selectedText) => {
          if (!ctx.state.canWriteThreads) {
            return;
          }
          ctx.post({ type: "threadCreate", selectedText });
        }
      : undefined,
    onMarkdown: (markdown) => {
      if (ctx.state.applyingExternal) {
        return;
      }
      if (normalizeMarkdown(markdown) === ctx.state.lastSent) {
        return;
      }
      scheduleSave(ctx, markdown);
    },
  });

  if (ctx.wantComments) {
    ctx.state.comments = mountComments(ctx.state.crepe.editor, {
      onOpenThread: (thread) => ctx.handles.chrome.showThread(thread),
      onOrphans: (orphans) => ctx.handles.chrome.setOrphans(orphans),
    });
  }

  ctx.handles.bar.persist(ctx.state.crepe.getMarkdown());

  if (ctx.wantComments) {
    ctx.post({ type: "threadsRefresh" });
  }

  if (ctx.state.pendingReveal) {
    const next = ctx.state.pendingReveal;
    ctx.state.pendingReveal = undefined;
    revealThreadInEditor(ctx, ctx.state.crepe, next.snippet);
  }
}

export function handleEditorMessage(ctx: EditorContext, msg: HostToWebview): void {
  routeEditorHostMessage(ctx, ctx.handles.pageChrome, msg);
}

export function shutdownEditor(ctx: EditorContext): void {
  flushPendingSave(ctx);
  if (ctx.timers.reveal) {
    clearTimeout(ctx.timers.reveal);
    ctx.timers.reveal = undefined;
  }
  ctx.state.comments?.destroy();
  ctx.state.comments = undefined;
  ctx.handles.chrome.destroy();
  if (ctx.state.crepe) {
    void ctx.state.crepe.destroy();
    ctx.state.crepe = undefined;
  }
}

export function wireEditorLifecycle(ctx: EditorContext): void {
  window.addEventListener("message", (event: MessageEvent<HostToWebview>) => {
    handleEditorMessage(ctx, event.data);
  });
  window.addEventListener("pagehide", () => shutdownEditor(ctx));
  window.addEventListener("unload", () => shutdownEditor(ctx));
}

export function startEditorApp(bridge?: HostBridge): void {
  const ctx = createEditorContext(bridge);
  wireEditorLifecycle(ctx);
  void startEditor(ctx);
}
