import { useCallback, useRef, useState } from "react";
import { isPosixUnder, rewritePosixPrefix } from "@slash-md/core/paths";
import type { PagePayload } from "../../../shared/api";
import { AppOperation } from "../enums";
import type { RunOp } from "./useOperationsController";

const api = () => window.slashmd;

export type TabState = {
  key: string;
  page: PagePayload;
  focusThreadId: string | null;
  dirty: boolean;
};

type Params = {
  runOp: RunOp;
};

export function useTabs({ runOp }: Params) {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const tabsRef = useRef<TabState[]>(tabs);
  const activeKeyRef = useRef<string | null>(activeKey);
  const orderRef = useRef<string[]>([]);

  const commitTabs = useCallback((next: TabState[]) => {
    tabsRef.current = next;
    setTabs(next);
  }, []);

  const commitActive = useCallback((key: string | null) => {
    activeKeyRef.current = key;
    setActiveKey(key);
  }, []);

  const touchOrder = useCallback((key: string) => {
    orderRef.current = [key, ...orderRef.current.filter((k) => k !== key)];
  }, []);

  const pickNextFor = useCallback(
    (current: TabState[], index: number): string | null => {
      const right = current[index + 1];
      if (right) {
        return right.key;
      }
      return (
        orderRef.current.find((k) => current.some((tab) => tab.key === k)) ??
        current[current.length - 1]?.key ??
        null
      );
    },
    [],
  );

  const onOpenPage = useCallback(
    async (path: string, threadId?: string) => {
      const existing = tabsRef.current.find((tab) => tab.key === path);
      if (existing) {
        if (threadId !== undefined) {
          commitTabs(
            tabsRef.current.map((tab) =>
              tab.key === path ? { ...tab, focusThreadId: threadId } : tab,
            ),
          );
        }
        commitActive(path);
        touchOrder(path);
        return;
      }

      await runOp(AppOperation.OpenPage, async () => {
        const page = await api().openPage(path);
        commitTabs([
          ...tabsRef.current,
          { key: path, page, focusThreadId: threadId ?? null, dirty: false },
        ]);
        commitActive(path);
        touchOrder(path);
      });
    },
    [runOp, commitTabs, commitActive, touchOrder],
  );

  const onActivateTab = useCallback(
    (key: string) => {
      commitActive(key);
      touchOrder(key);
    },
    [commitActive, touchOrder],
  );

  const onCloseTab = useCallback(
    (key?: string) => {
      const current = tabsRef.current;
      const target = key ?? activeKeyRef.current;
      const index = current.findIndex((tab) => tab.key === target);
      if (!target || index < 0) {
        return;
      }
      const remaining = current.filter((tab) => tab.key !== target);
      orderRef.current = orderRef.current.filter((k) => k !== target);
      if (remaining.length === 0) {
        commitActive(null);
        commitTabs([]);
        return;
      }
      if (activeKeyRef.current === target) {
        commitActive(pickNextFor(current, index));
      }
      commitTabs(remaining);
    },
    [commitActive, commitTabs, pickNextFor],
  );

  const onClosePage = useCallback(() => {
    onCloseTab();
  }, [onCloseTab]);

  const onCloseAllPages = useCallback(() => {
    orderRef.current = [];
    commitActive(null);
    commitTabs([]);
  }, [commitActive, commitTabs]);

  const onCloseTabsUnder = useCallback(
    (prefix: string) => {
      const current = tabsRef.current;
      const targets = new Set(
        current
          .filter((tab) => tab.key === prefix || isPosixUnder(tab.key, prefix))
          .map((tab) => tab.key),
      );
      if (targets.size === 0) {
        return;
      }
      const remaining = current.filter((tab) => !targets.has(tab.key));
      orderRef.current = orderRef.current.filter((k) => !targets.has(k));
      if (remaining.length === 0) {
        commitActive(null);
        commitTabs([]);
        return;
      }
      if (activeKeyRef.current && targets.has(activeKeyRef.current)) {
        const index = current.findIndex(
          (tab) => tab.key === activeKeyRef.current,
        );
        commitActive(pickNextFor(current, index));
      }
      commitTabs(remaining);
    },
    [commitActive, commitTabs, pickNextFor],
  );

  const onRewritePath = useCallback(
    (from: string, to: string) => {
      const active = activeKeyRef.current;
      const rewritten = (path: string) =>
        path === from ? to : rewritePosixPrefix(path, from, to);
      if (active && (active === from || isPosixUnder(active, from))) {
        commitActive(rewritten(active));
      }
      orderRef.current = orderRef.current.map((k) =>
        k === from || isPosixUnder(k, from) ? rewritten(k) : k,
      );
      const seen = new Set<string>();
      const next: TabState[] = [];
      for (const tab of tabsRef.current) {
        const key =
          tab.key === from || isPosixUnder(tab.key, from)
            ? rewritten(tab.key)
            : tab.key;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        next.push({
          ...tab,
          key,
          page: key === tab.key ? tab.page : { ...tab.page, path: key },
        });
      }
      commitTabs(next);
    },
    [commitActive, commitTabs],
  );

  const onPage = useCallback(
    (next: PagePayload) => {
      commitTabs(
        tabsRef.current.map((tab) =>
          tab.key === next.path ? { ...tab, page: next } : tab,
        ),
      );
    },
    [commitTabs],
  );

  const onReloadPage = useCallback(async () => {
    const active = activeKeyRef.current;
    if (!active) {
      return;
    }
    const page = await api().openPage(active);
    commitTabs(
      tabsRef.current.map((tab) =>
        tab.key === active ? { ...tab, page } : tab,
      ),
    );
  }, [commitTabs]);

  const onDirtyChange = useCallback(
    (key: string, dirty: boolean) => {
      if (!tabsRef.current.some((tab) => tab.key === key && tab.dirty !== dirty)) {
        return;
      }
      commitTabs(
        tabsRef.current.map((tab) =>
          tab.key === key ? { ...tab, dirty } : tab,
        ),
      );
    },
    [commitTabs],
  );

  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? null;
  const page = activeTab?.page ?? null;
  const focusThreadId = activeTab?.focusThreadId ?? null;

  return {
    tabs,
    activeKey,
    page,
    focusThreadId,
    onOpenPage,
    onActivateTab,
    onCloseTab,
    onClosePage,
    onCloseAllPages,
    onCloseTabsUnder,
    onRewritePath,
    onPage,
    onReloadPage,
    onDirtyChange,
  };
}

export type TabSessionApi = ReturnType<typeof useTabs>;