import { useMemo } from "react";
import { pageTrail, resolveAppPhase } from "../utils";
import { usePageSession } from "./usePageSession";
import { useRun } from "./useRun";
import { useWorkspace } from "./useWorkspace";

export function useAppController() {
  const chrome = useRun();
  const page = usePageSession({ run: chrome.run });
  const workspace = useWorkspace({
    run: chrome.run,
    onError: chrome.onError,
    onClearPage: page.onClosePage,
  });

  const trail = useMemo(
    () => pageTrail(page.page, workspace.tree),
    [page.page, workspace.tree],
  );

  return {
    phase: resolveAppPhase(workspace.workspace),
    session: {
      workspace: workspace.workspace,
      tree: workspace.tree,
      page: page.page,
      trail,
      focusThreadId: page.focusThreadId,
    },
    chrome: {
      busy: chrome.busy,
      error: chrome.error,
    },
    actions: {
      onRefresh: workspace.onRefresh,
      onError: chrome.onError,
      onOpenPage: page.onOpenPage,
      onClosePage: page.onClosePage,
      onPage: page.onPage,
      onOpenFolder: workspace.onOpenFolder,
      onOpenPath: workspace.onOpenPath,
      onChangeFolder: workspace.onChangeFolder,
      onCloseWorkspace: workspace.onCloseWorkspace,
    },
    run: chrome.run,
  };
}

export type AppControllerApi = ReturnType<typeof useAppController>;
