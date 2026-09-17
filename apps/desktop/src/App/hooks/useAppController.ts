import { useMemo, useRef } from "react";
import { pageTrail, resolveAppPhase } from "../utils";
import { useFocusRefresh } from "./useFocusRefresh";
import { useOperationsController } from "./useOperationsController";
import { useRun } from "./useRun";
import { useTabs } from "./useTabs";
import { useWorkspace } from "./useWorkspace";

export function useAppController() {
  const chrome = useRun();
  const fetchWorkspace = useRef<() => Promise<void>>(async () => undefined);
  const operations = useOperationsController({
    run: chrome.run,
    onRefresh: () => fetchWorkspace.current(),
    error: chrome.error,
  });
  const session = useTabs({ runOp: operations.runOp });
  const workspace = useWorkspace({
    runOp: operations.runOp,
    onError: chrome.onError,
    onClearPage: session.onCloseAllPages,
    onSyncGit: operations.onSyncGit,
  });
  fetchWorkspace.current = workspace.onRefresh;

  useFocusRefresh({
    onRefresh: workspace.onRefresh,
    onReloadPage: session.onReloadPage,
  });

  const trail = useMemo(
    () => pageTrail(session.page, workspace.tree),
    [session.page, workspace.tree],
  );

  return {
    phase: resolveAppPhase(workspace.workspace),
    session: {
      workspace: workspace.workspace,
      tree: workspace.tree,
      git: operations.git,
      page: session.page,
      trail,
      focusThreadId: session.focusThreadId,
      tabs: session.tabs,
      activeKey: session.activeKey,
    },
    chrome: {
      busy: operations.busy,
      error: chrome.error,
    },
    operations,
    actions: {
      onRefresh: workspace.onRefresh,
      onError: chrome.onError,
      onOpenPage: session.onOpenPage,
      onClosePage: session.onClosePage,
      onPage: session.onPage,
      onActivateTab: session.onActivateTab,
      onCloseTab: session.onCloseTab,
      onCloseAllPages: session.onCloseAllPages,
      onCloseTabsUnder: session.onCloseTabsUnder,
      onRewritePath: session.onRewritePath,
      onDirtyChange: session.onDirtyChange,
      onOpenFolder: workspace.onOpenFolder,
      onOpenPath: workspace.onOpenPath,
      onChangeFolder: workspace.onChangeFolder,
      onCloseWorkspace: workspace.onCloseWorkspace,
    },
  };
}

export type AppControllerApi = ReturnType<typeof useAppController>;
