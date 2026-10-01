import { useRef, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import type { TabBarApi } from "../hooks/useTabBarController";
import { TabItem } from "./TabItem";

type Props = Omit<TabBarApi, "empty">;

export function TabList({ items, onActivateTab, onCloseTab }: Props) {
  const { t } = useTranslation();
  const tabRefs = useRef(new Map<string, HTMLDivElement>());
  const activeIndex = items.findIndex((item) => item.selected);

  const activateAt = (index: number) => {
    const item = items[index];
    if (!item) {
      return;
    }
    onActivateTab(item.tabId);
    tabRefs.current.get(item.key)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const count = items.length;
    if (count === 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const base = activeIndex >= 0 ? activeIndex : 0;
    let next = base;
    if (event.key === "ArrowLeft") {
      next = (base - 1 + count) % count;
    } else if (event.key === "ArrowRight") {
      next = (base + 1) % count;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    }
    activateAt(next);
  };

  return (
    <div
      role="tablist"
      aria-label={t("home.tabs.aria")}
      className="flex min-h-8 items-end gap-1"
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => (
        <TabItem
          key={item.key}
          item={item}
          onActivateTab={onActivateTab}
          onCloseTab={onCloseTab}
          ref={(node) => {
            if (node) {
              tabRefs.current.set(item.key, node);
            } else {
              tabRefs.current.delete(item.key);
            }
          }}
        />
      ))}
    </div>
  );
}