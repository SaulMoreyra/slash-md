import { Button } from "@heroui/react";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { IconClose } from "../../../../../components/icons";
import type { TabItemView } from "../hooks/useTabBarController";

type Props = {
  item: TabItemView;
  onActivateTab: (key: string) => void;
  onCloseTab: (key: string) => void;
};

export function TabItem({ item, onActivateTab, onCloseTab }: Props) {
  const { t } = useTranslation();
  const selectedClass = item.selected
    ? "border-foreground bg-surface text-foreground"
    : "border-transparent text-muted hover:text-foreground";
  const ariaLabel = item.dirty ? `${item.label} (${t("home.tabs.dirty")})` : item.label;

  const handleCloseClick = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      role="tab"
      aria-selected={item.selected}
      aria-label={ariaLabel}
      tabIndex={item.selected ? 0 : -1}
      title={item.label}
      className={`flex max-w-48 min-w-0 cursor-pointer items-center gap-1.5 border-b-2 px-2 py-1.5 text-sm ${selectedClass}`}
      onClick={() => onActivateTab(item.tabId)}
    >
      <DirtyMark dirty={item.dirty} />
      <span className="min-w-0 truncate">{item.label}</span>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className="size-6 min-w-6"
        aria-label={t("home.tabs.close", { title: item.label })}
        onClick={handleCloseClick}
        onPress={() => onCloseTab(item.tabId)}
      >
        <IconClose size={14} />
      </Button>
    </div>
  );
}

function DirtyMark({ dirty }: { dirty: boolean }) {
  if (!dirty) {
    return null;
  }
  return <span className="size-1.5 shrink-0 rounded-full bg-foreground/70" aria-hidden />;
}
