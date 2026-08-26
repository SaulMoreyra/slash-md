import type { ReactNode, RefObject } from "react";
import { Button, Card } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconMore } from "../../../../components/icons";

type Props = {
  moreOpen: boolean;
  moreRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  children: ReactNode;
};

export function MoreActionsMenu({ moreOpen, moreRef, onToggle, children }: Props) {
  const { t } = useTranslation();
  return (
    <div className="relative" ref={moreRef}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={moreOpen}
        aria-label={t("editor.moreActions")}
        onPress={onToggle}
      >
        <IconMore />
      </Button>
      {moreOpen ? (
        <Card className="absolute right-0 z-50 mt-1 min-w-48 rounded-2xl border border-separator bg-overlay p-1 shadow-lg" role="menu">
          <div className="flex flex-col gap-0.5">{children}</div>
        </Card>
      ) : null}
    </div>
  );
}
