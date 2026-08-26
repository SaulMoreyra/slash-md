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
    case "openUrl":
      await deps.openUrl(message.url);
      return;
    case "threadsRefresh":
    case "threadReply":
    case "threadResolve":
    case "threadCreate":
    case "review":
    case "publish":
      return;
    default:
      assertNever(message);
  }
}
