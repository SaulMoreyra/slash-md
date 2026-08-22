import * as vscode from "vscode";
import { ContentRepo } from "./github/contentRepo";
import { pushThreads } from "./threadActions";

const POLL_MS = 45_000;

/**
 * Poll GitHub review threads while a Workspace draft is in review.
 * No-op for Editor mode, Personal mode, or drafts without an open PR.
 */
export function attachThreadPolling(opts: {
  context: vscode.ExtensionContext;
  document: vscode.TextDocument;
  webview: vscode.Webview;
  panel: vscode.WebviewPanel;
  workflow: "workspace" | "editor";
  repos: ContentRepo;
}): { refresh(): Promise<void>; dispose(): void } {
  const { context, document, webview, panel, workflow, repos } = opts;
  let timer: ReturnType<typeof setInterval> | undefined;
  let inflight = false;

  const refresh = async (): Promise<void> => {
    if (inflight || workflow !== "workspace") {
      return;
    }
    inflight = true;
    try {
      await pushThreads(context, document, webview, repos);
    } finally {
      inflight = false;
    }
  };

  const startTimer = () => {
    if (timer) {
      return;
    }
    timer = setInterval(() => {
      if (panel.visible) {
        void refresh();
      }
    }, POLL_MS);
  };

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const visibility = panel.onDidChangeViewState(() => {
    if (panel.visible) {
      void refresh();
      startTimer();
    } else {
      stopTimer();
    }
  });

  if (panel.visible) {
    void refresh();
    startTimer();
  }

  return {
    refresh,
    dispose() {
      stopTimer();
      visibility.dispose();
    },
  };
}
