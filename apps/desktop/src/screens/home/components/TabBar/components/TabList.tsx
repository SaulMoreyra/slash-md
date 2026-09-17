import { useTranslation } from "react-i18next";
import type { TabBarApi } from "../hooks/useTabBarController";
import { TabItem } from "./TabItem";

type Props = Omit<TabBarApi, "empty">;

export function TabList({ items, onActivateTab, onCloseTab }: Props) {
  const { t } = useTranslation();
  return (
    <div role="tablist" aria-label={t("home.tabs.aria")} className="flex min-h-9">
      {items.map((item) => (
        <TabItem
          key={item.key}
          item={item}
          onActivateTab={onActivateTab}
          onCloseTab={onCloseTab}
        />
      ))}
    </div>
  );
}
