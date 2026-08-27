import { Button, Card, Chip, ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconArrowUp, IconMerge } from "../../../../components/icons";
import type { HomeTreePayload } from "../../../../../shared/api";
import type { RunOp } from "../../types";
import { PaneHeader } from "../PaneHeader";
import { DraftEmpty } from "./components/DraftEmpty";
import { DraftList } from "./components/DraftList";
import { DraftPublishButton } from "./components/DraftPublishButton";
import { DraftSendButton } from "./components/DraftSendButton";
import { useDraftPaneController } from "./hooks/useDraftPaneController";

type Props = {
  payload: HomeTreePayload;
  personal: boolean;
  busy: boolean;
  pagePath: string | null;
  trails: Map<string, string>;
  runOp: RunOp;
  onRefresh: () => Promise<void>;
  onOpenPage: (path: string) => void;
  onClosePage: () => void;
  onNewPage: () => void;
  onReview: () => void;
  onNewPublication?: () => void;
};

export function DraftPane({
  payload,
  personal,
  busy,
  pagePath,
  trails,
  runOp,
  onRefresh,
  onOpenPage,
  onClosePage,
  onNewPage,
  onReview,
  onNewPublication,
}: Props) {
  const { t } = useTranslation();
  const isWorkspace = !personal;
  const hasPublication = Boolean(payload.publication);
  const needsPublication = isWorkspace && !hasPublication;
  const publicationMode = isWorkspace && hasPublication;

  const {
    selected,
    count,
    empty,
    title,
    trailFor,
    onToggle,
    onDiscard,
    onPublish,
  } = useDraftPaneController({
    payload,
    personal,
    pagePath,
    trails,
    runOp,
    onRefresh,
    onOpenPage,
    onClosePage,
  });

  if (needsPublication && empty) {
    return (
      <>
        <PaneHeader title={title} />
        <ScrollShadow className="min-h-0 flex-1 [--scroll-shadow-scrollbar-size:0px]">
          <DraftEmpty
            needsPublication
            onNewPage={onNewPage}
            onNewPublication={onNewPublication}
          />
        </ScrollShadow>
      </>
    );
  }

  return (
    <>
      <PaneHeader title={title}>
        {!empty ? (
          <div className="flex flex-row items-center justify-end gap-2">
            <Chip size="sm" variant="soft" color="accent">
              <Chip.Label>
                {t("home.drafts.modifiedCount", {
                  count: payload.drafts.length,
                })}
              </Chip.Label>
            </Chip>
            {personal ? (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={t("home.drafts.publish")}
                isDisabled={busy}
                onPress={onPublish}
              >
                <IconArrowUp size={16} />
              </Button>
            ) : null}
            {publicationMode ? (
              <DraftSendButton
                busy={busy}
                canSendReview={Boolean(payload.canSendReview)}
                onReview={onReview}
              />
            ) : null}
          </div>
        ) : null}
      </PaneHeader>
      <ScrollShadow className="min-h-0 flex-1 [--scroll-shadow-scrollbar-size:0px]">
        {empty ? (
          <DraftEmpty onNewPage={onNewPage} />
        ) : (
          <DraftList
            drafts={payload.drafts}
            title={title}
            pagePath={pagePath}
            personal={personal || publicationMode}
            busy={busy}
            selected={selected}
            trailFor={trailFor}
            onOpenPage={onOpenPage}
            onToggle={onToggle}
            onDiscard={onDiscard}
          />
        )}
      </ScrollShadow>
      {!empty && personal ? (
        <Card.Footer className="px-4 pb-4">
          <DraftPublishButton
            busy={busy}
            count={payload.drafts.length}
            onPublish={onPublish}
          />
        </Card.Footer>
      ) : null}
      {!empty && !personal && !publicationMode ? (
        <Card.Footer className="px-4 pb-4">
          <Button
            variant="primary"
            fullWidth
            isDisabled={busy || count === 0}
            onPress={onReview}
          >
            <IconMerge />
            {t("home.drafts.sendCount", { count })}
          </Button>
        </Card.Footer>
      ) : null}
    </>
  );
}
