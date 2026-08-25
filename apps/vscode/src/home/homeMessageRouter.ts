import type { HomeFromWebview } from "@slash-md/core/homeProtocol";
import type { HomePanelDeps } from "./homePanelDeps";

function assertNever(value: never): never {
  throw new Error(`Unhandled Home message: ${JSON.stringify(value)}`);
}

/** Single entry point for all Home webview → host messages. */
export async function routeHomeMessage(deps: HomePanelDeps, message: HomeFromWebview): Promise<void> {
  if (!message?.type) {
    return;
  }

  switch (message.type) {
    case "ready":
      await deps.pushTree();
      return;
    case "refresh":
      await deps.invalidateInboxAndPushTree();
      return;
    case "open":
      await deps.openDoc(message.path);
      await deps.refresh();
      return;
    case "rename":
      await deps.renameDoc(message.path);
      await deps.refresh();
      return;
    case "delete":
      await deps.deleteDoc(message.path);
      await deps.refresh();
      return;
    case "new":
      await deps.createNew(message.section);
      await deps.refresh();
      return;
    case "newFolder":
      await deps.createFolder(message.parent);
      await deps.refresh();
      return;
    case "init":
      await deps.runWorkspaceInit();
      return;
    case "signIn":
      await deps.signInGithub();
      return;
    case "toggleDraft":
      await deps.toggleDraft(message.path);
      await deps.pushTree();
      return;
    case "selectAllDrafts":
      await deps.selectAllDrafts();
      await deps.pushTree();
      return;
    case "setDraftSelection":
      await deps.setDraftSelection(
        Array.isArray(message.paths) ? message.paths.filter((path): path is string => typeof path === "string") : [],
      );
      await deps.pushTree();
      return;
    case "previewReview":
      await deps.previewReview();
      return;
    case "reviewBatch":
      await deps.reviewBatch();
      return;
    case "publishBatch":
      await deps.publishBatch();
      return;
    case "openInbox":
      await deps.openInbox({
        path: message.path,
        prNumber: typeof message.prNumber === "number" ? message.prNumber : Number(message.prNumber),
        threadId: typeof message.threadId === "string" ? message.threadId : "",
        prUrl: typeof message.prUrl === "string" ? message.prUrl : undefined,
        snippet: typeof message.snippet === "string" ? message.snippet : undefined,
        line: typeof message.line === "number" ? message.line : null,
        startLine: typeof message.startLine === "number" ? message.startLine : null,
      });
      return;
    case "getConfig":
      await deps.getConfig();
      return;
    case "saveConfig":
      if (message.config) {
        await deps.saveConfig(message.config);
      }
      return;
    case "renameFolder":
      await deps.renameFolder(message.path);
      return;
    case "openIndex":
      await deps.openIndex();
      return;
    case "createIndex":
      await deps.createIndex();
      return;
    default:
      assertNever(message);
  }
}
