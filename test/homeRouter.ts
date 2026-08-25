import type { HomePanelDeps } from "../apps/vscode/src/home/homePanelDeps";
import { routeHomeMessage } from "../apps/vscode/src/home/homeMessageRouter";

export async function runHomeRouterTests(assert: (ok: boolean, message: string) => void): Promise<void> {
  const calls: string[] = [];
  const deps: HomePanelDeps = {
    pushTree: async () => {
      calls.push("pushTree");
    },
    refresh: async () => {
      calls.push("refresh");
    },
    invalidateInboxAndPushTree: async () => {
      calls.push("invalidateInboxAndPushTree");
    },
    openDoc: async (path) => {
      calls.push(`openDoc:${path}`);
    },
    renameDoc: async () => {
      calls.push("renameDoc");
    },
    deleteDoc: async () => {
      calls.push("deleteDoc");
    },
    createNew: async () => {
      calls.push("createNew");
    },
    createFolder: async () => {
      calls.push("createFolder");
    },
    runWorkspaceInit: async () => {
      calls.push("runWorkspaceInit");
    },
    signInGithub: async () => {
      calls.push("signInGithub");
    },
    toggleDraft: async (path) => {
      calls.push(`toggleDraft:${path}`);
    },
    selectAllDrafts: async () => {
      calls.push("selectAllDrafts");
    },
    setDraftSelection: async (paths) => {
      calls.push(`setDraftSelection:${paths.length}`);
    },
    previewReview: async () => {
      calls.push("previewReview");
    },
    reviewBatch: async () => {
      calls.push("reviewBatch");
    },
    publishBatch: async () => {
      calls.push("publishBatch");
    },
    openInbox: async () => {
      calls.push("openInbox");
    },
    getConfig: async () => {
      calls.push("getConfig");
    },
    saveConfig: async () => {
      calls.push("saveConfig");
    },
    renameFolder: async () => {
      calls.push("renameFolder");
    },
    openIndex: async () => {
      calls.push("openIndex");
    },
    createIndex: async () => {
      calls.push("createIndex");
    },
    postReviewPreview: async () => {
      calls.push("postReviewPreview");
    },
  };

  await routeHomeMessage(deps, { type: "ready" });
  assert(calls.includes("pushTree"), "routeHomeMessage ready calls pushTree");

  calls.length = 0;
  await routeHomeMessage(deps, { type: "refresh" });
  assert(calls.includes("invalidateInboxAndPushTree"), "routeHomeMessage refresh invalidates inbox");

  calls.length = 0;
  await routeHomeMessage(deps, { type: "reviewBatch" });
  assert(calls.includes("reviewBatch"), "routeHomeMessage reviewBatch delegates");

  calls.length = 0;
  await routeHomeMessage(deps, { type: "open", path: "docs/a.md" });
  assert(calls.includes("openDoc:docs/a.md") && calls.includes("refresh"), "routeHomeMessage open refreshes");
}
