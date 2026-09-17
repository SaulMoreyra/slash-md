import { useMemo } from "react";
import type { PagePayload } from "../../../../../shared/api";
import type { RunOp } from "../../../hooks/useOperationsController";
import { useApp } from "../../../context";

export type EditorPanelItem = {
  key: string;
  tabId: string;
  page: PagePayload;
  focusThreadId: string | null;
  active: boolean;
  trail?: string;
};

export function useEditorSlotController() {
  const { session, chrome, actions, operations } = useApp();

  const items = useMemo<EditorPanelItem[]>(
    () =>
      session.tabs.map((tab) => ({
        key: tab.key,
        tabId: tab.key,
        page: tab.page,
        focusThreadId: tab.focusThreadId,
        active: tab.key === session.activeKey,
        trail: tab.key === session.activeKey ? session.trail : undefined,
      })),
    [session.tabs, session.activeKey, session.trail],
  );

  return {
    items,
    empty: items.length === 0,
    busy: chrome.busy,
    auth: session.workspace?.auth,
    onError: actions.onError,
    onPage: actions.onPage,
    onRefresh: actions.onRefresh,
    onDirtyChange: actions.onDirtyChange,
    onCloseTab: actions.onCloseTab,
    runOp: operations.runOp as RunOp,
  };
}

export type EditorSlotApi = ReturnType<typeof useEditorSlotController>;