import type { HostToWebview } from "@slash-md/core/protocol";
import { normalizeMarkdown } from "@slash-md/core/markdown";
import type { EditorContext } from "../context";
import { handleImageMessage } from "../core/images";
import { setCrepeMarkdown } from "../core/crepe";
import { revealThreadInEditor } from "../threads/reveal";

export type EditorChromeHandles = {
  bar: {
    onHostMessage(msg: HostToWebview): void;
  };
  frontmatter: { apply(fields: import("@slash-md/core/protocol").FrontmatterFields): void };
  icon: { apply(fields: import("@slash-md/core/protocol").FrontmatterFields): void };
  cover: {
    apply(fields: import("@slash-md/core/protocol").FrontmatterFields): void;
    onHostMessage(msg: HostToWebview): void;
  };
  edited: {
    apply(payload: import("@slash-md/core/protocol").FileEditorsPayload): void;
    onHostMessage(msg: HostToWebview): void;
  };
};

/** Routes host → webview messages. Single `window.message` listener should call this. */
export function routeEditorHostMessage(ctx: EditorContext, chrome: EditorChromeHandles, msg: HostToWebview): void {
  if (!msg?.type) {
    return;
  }

  if (handleImageMessage(ctx, msg)) {
    chrome.cover.onHostMessage(msg);
    return;
  }

  switch (msg.type) {
    case "saved":
      chrome.bar.onHostMessage(msg);
      chrome.edited.onHostMessage(msg);
      return;
    case "status":
    case "init":
      chrome.bar.onHostMessage(msg);
      return;
    case "frontmatter":
      chrome.frontmatter.apply(msg.fields);
      chrome.icon.apply(msg.fields);
      chrome.cover.apply(msg.fields);
      return;
    case "editors":
      chrome.edited.apply({
        editors: msg.editors ?? [],
        lastEditedAt: msg.lastEditedAt ?? null,
        createdAt: msg.createdAt ?? null,
        createdBy: msg.createdBy ?? null,
        you: msg.you ?? null,
      });
      return;
    case "setText": {
      const crepe = ctx.state.crepe;
      if (!crepe) {
        return;
      }
      if (normalizeMarkdown(msg.text) === normalizeMarkdown(crepe.getMarkdown())) {
        return;
      }
      ctx.state.applyingExternal = true;
      try {
        setCrepeMarkdown(crepe, msg.text);
        ctx.state.lastSent = normalizeMarkdown(msg.text);
        ctx.handles.bar.persist(msg.text);
      } finally {
        ctx.state.applyingExternal = false;
      }
      if (ctx.state.comments && ctx.state.latestThreads.length > 0) {
        ctx.state.comments.apply(ctx.state.latestThreads);
      }
      return;
    }
    case "threads":
      ctx.state.latestThreads = msg.threads ?? [];
      ctx.state.canWriteThreads = Boolean(msg.canWrite);
      ctx.handles.chrome.setCanWrite(ctx.state.canWriteThreads);
      if (ctx.state.comments) {
        ctx.state.comments.apply(ctx.state.latestThreads);
      } else {
        ctx.handles.chrome.setOrphans([]);
      }
      ctx.handles.chrome.applyThreads(ctx.state.latestThreads);
      return;
    case "revealThread":
      if (!ctx.state.crepe) {
        ctx.state.pendingReveal = { snippet: msg.snippet, threadId: msg.threadId };
        return;
      }
      revealThreadInEditor(ctx, ctx.state.crepe, msg.snippet);
      return;
    case "reviewContext":
      ctx.handles.reviewContext.show(msg);
      return;
    case "imageMap":
    case "imageUploaded":
    case "imageResolved":
      chrome.cover.onHostMessage(msg);
      return;
    default:
      return;
  }
}
