import { Card } from "@heroui/react";
import type { ReactNode } from "react";
import { use } from "react";
import { useTranslation } from "react-i18next";
import { IconWorkPane } from "../../../../components/icons";
import { shortcutLabel } from "../../../../components/ShortcutKbd";
import { PaneCloseButton } from "../PaneCloseButton";
import { PaneChromeContext } from "./context";

type Props = {
  title: string;
  children?: ReactNode;
};

export function PaneHeader({ title, children }: Props) {
  return (
    <div className="px-4 pt-2">
      <Card.Header className="flex flex-row items-center justify-between">
        <Card.Title className="min-w-0 flex-1 truncate">{title}</Card.Title>
        <div className="flex shrink-0 items-center gap-1">
          <PaneCollapse />
        </div>
      </Card.Header>
      {children}
    </div>
  );
}

function PaneCollapse() {
  const chrome = use(PaneChromeContext);
  const { t } = useTranslation();

  if (!chrome) {
    return null;
  }

  return (
    <PaneCloseButton
      label={t("home.drafts.close")}
      keys={shortcutLabel.togglePane()}
      onPress={chrome.onClose}
    >
      <IconWorkPane />
    </PaneCloseButton>
  );
}
