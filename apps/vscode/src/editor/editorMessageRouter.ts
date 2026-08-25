import type { FrontmatterKey, WebviewToHost } from "@slash-md/core/protocol";
import type { EditorSessionDeps } from "./editorSessionDeps";

function assertNever(value: never): never {
  throw new Error(`Unhandled editor message: ${JSON.stringify(value)}`);
}

function isWebviewToHost(message: { type?: string } | undefined): message is WebviewToHost {
  return Boolean(message?.type);
}

/** Single entry point for all editor webview → host messages. */
export async function routeEditorMessage(
  deps: EditorSessionDeps,
  message: { type?: string } | WebviewToHost | undefined,
): Promise<void> {
  if (!isWebviewToHost(message)) {
    return;
  }

  switch (message.type) {
    case "threadsRefresh":
      await deps.refreshThreads();
      return;
    case "threadReply":
      await deps.threadReply(message.threadId, message.body);
      return;
    case "threadResolve":
      await deps.threadResolve(message.threadId, message.resolved);
      return;
    case "threadCreate":
      deps.flushSaveTimer();
      await deps.persistNow();
      await deps.threadCreate(message.selectedText);
      return;
    case "edit":
      deps.applyEdit(message.text);
      deps.persistSoon();
      return;
    case "frontmatter":
      if (!deps.frontmatterKeys.has(message.field)) {
        return;
      }
      deps.applyFrontmatter(message.field as FrontmatterKey, message.value);
      deps.persistSoon();
      return;
    case "uploadImage":
      await deps.uploadImage(message);
      return;
    case "resolveImage":
      await deps.resolveImage(message);
      return;
    case "review":
    case "publish": {
      if (deps.workflow === "editor") {
        return;
      }
      if (deps.state.reviewing) {
        return;
      }
      deps.state.reviewing = true;
      try {
        deps.flushSaveTimer();
        if (typeof message.text === "string") {
          deps.applyEdit(message.text);
        }
        await deps.persistNow();
        await deps.reviewOrPublish(message.type);
        deps.refreshLabels();
      } finally {
        deps.state.reviewing = false;
      }
      return;
    }
    case "openUrl":
      await deps.openUrl(message.url);
      return;
    default:
      assertNever(message);
  }
}
