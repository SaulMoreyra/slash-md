import { useMemo, useRef } from "react";
import { pageTrail, resolveAppPhase } from "../utils";
import { useOperationsController } from "./useOperationsController";
import { usePageSession } from "./usePageSession";
import { useRun } from "./useRun";
import { useWorkspace } from "./useWorkspace";

export function useAppController() {
  const chrome = useRun();
  const fetchWorkspace = useRef<() => Promise<void>>(async () => undefined);
  const operations = useOperationsController({
    run: chrome.run,
    onRefresh: () => fetchWorkspace.current(),
    error: chrome.error,
  });
  const page = usePageSession({ runOp: operations.runOp });
  const workspace = useWorkspace({
    runOp: operations.runOp,
    onError: chrome.onError,
    onClearPage: page.onClosePage,
    onSyncGit: operations.onSyncGit,
  });
  fetchWorkspace.current = workspace.onRefresh;

  const trail = useMemo(
    () => pageTrail(page.page, workspace.tree),
    [page.page, workspace.tree],
  );

  return {
    phase: resolveAppPhase(workspace.workspace),
    session: {
      workspace: workspace.workspace,
      tree: workspace.tree,
      git: operations.git,
      page: page.page,
      trail,
      focusThreadId: page.focusThreadId,
    },
    chrome: {
      busy: operations.busy,
      error: chrome.error,
    },
    operations,
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
  };
}

export type AppControllerApi = ReturnType<typeof useAppController>;
