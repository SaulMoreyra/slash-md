import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TabState } from "../../../../../App/hooks/useTabs";
import { clampLabel, tabLabel } from "../utils";

export type TabBarProps = {
  tabs: TabState[];
  activeKey: string | null;
  onActivateTab: (key: string) => void;
  onCloseTab: (key: string) => void;
};

export type TabItemView = {
  key: string;
  tabId: string;
  label: string;
  labelFull: string;
  dirty: boolean;
  selected: boolean;
};

export function useTabBarController({
  tabs,
  activeKey,
  onActivateTab,
  onCloseTab,
}: TabBarProps) {
  const { t } = useTranslation();
  const untitled = t("common.untitled");

  const items = useMemo<TabItemView[]>(
    () =>
      tabs.map((tab) => {
        const labelFull = tabLabel(tab.page.path, tab.page.frontmatter.title, untitled);
        return {
          key: tab.key,
          tabId: tab.key,
          label: clampLabel(labelFull),
          labelFull,
          dirty: tab.dirty,
          selected: tab.key === activeKey,
        };
      }),
    [tabs, activeKey, untitled],
  );

  return {
    items,
    empty: items.length === 0,
    onActivateTab,
    onCloseTab,
  };
}

export type TabBarApi = ReturnType<typeof useTabBarController>;
