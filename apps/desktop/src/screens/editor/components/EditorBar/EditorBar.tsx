import type { ReactNode, RefObject } from "react";
import { Button, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconChat, IconClose, IconHistory, IconSparkles } from "../../../../components/icons";
import { shortcutLabel } from "../../../../components/ShortcutKbd";
import { SaveStatus } from "../../enums";
import { MoreActionsMenu } from "../MoreActionsMenu";
import { BreadcrumbTrail } from "./components/BreadcrumbTrail";

type Props = {
  crumbs: string[];
  publicationTitle?: string;
  inReview?: boolean;
  status: SaveStatus;
  openPr: string | null | undefined;
  threadsCount: number;
  chatOpen?: boolean;
  moreOpen: boolean;
  moreRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onToggleMore: () => void;
  onToggleChat?: () => void;
  onOpenFirstThread: () => void;
  children: ReactNode;
};

export function EditorBar({
  crumbs,
  publicationTitle,
  inReview = false,
  status,
  openPr,
  threadsCount,
  chatOpen = false,
  moreOpen,
  moreRef,
  onClose,
  onToggleMore,
  onToggleChat,
  onOpenFirstThread,
  children,
}: Props) {
  const { t } = useTranslation();
  const api = () => window.slashmd;

  return (
    <header className="flex w-full min-w-0 shrink-0 items-center justify-between gap-3 border-b border-separator px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="shrink-0"
          aria-label={`${t("editor.close")} (${shortcutLabel.closePage()})`}
          onPress={onClose}
        >
          <IconClose />
        </Button>
        <BreadcrumbTrail crumbs={crumbs} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {publicationTitle ? (
          <Chip size="sm" variant="soft" className="max-w-36" title={publicationTitle}>
            <Chip.Label className="truncate">{publicationTitle}</Chip.Label>
          </Chip>
        ) : null}
        {inReview ? (
          <Chip
            size="sm"
            variant="soft"
            color="accent"
            title={t("editor.banner")}
            className="cursor-default"
          >
            <Chip.Label>{t("editor.lifecycle.in_review")}</Chip.Label>
          </Chip>
        ) : null}
        <Chip
          size="sm"
          variant="soft"
          className={status === SaveStatus.Error ? "text-danger" : undefined}
          title={`${t(`editor.status.${status}`)} · ${shortcutLabel.save()}`}
        >
          <Chip.Label>{t(`editor.status.${status}`)}</Chip.Label>
        </Chip>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={openPr ? t("editor.historyOpen") : t("editor.historyNone")}
          isDisabled={!openPr}
          onPress={() => {
            if (openPr) {
              void api().openUrl(openPr);
            }
          }}
        >
          <IconHistory />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t("editor.comments")}
          isDisabled={threadsCount === 0}
          onPress={onOpenFirstThread}
        >
          <IconChat />
        </Button>
        {onToggleChat ? (
          <Button
            isIconOnly
            size="sm"
            variant={chatOpen ? "primary" : "ghost"}
            aria-label={t("editor.aiChat")}
            aria-pressed={chatOpen}
            onPress={onToggleChat}
          >
            <IconSparkles />
          </Button>
        ) : null}
        <MoreActionsMenu moreOpen={moreOpen} moreRef={moreRef} onToggle={onToggleMore}>
          {children}
        </MoreActionsMenu>
      </div>
    </header>
  );
}
