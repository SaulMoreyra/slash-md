import { Button, Card, Chip, Description, ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconMerge } from "../../../../components/icons";
import type { HomeTreePayload } from "../../../../../shared/api";
import type { Run } from "../../types";
import { PaneHeader } from "../PaneHeader";
import { DraftEmpty } from "./components/DraftEmpty";
import { DraftList } from "./components/DraftList";
import { useDraftPaneController } from "./hooks/useDraftPaneController";

type Props = {
  payload: HomeTreePayload;
  personal: boolean;
  busy: boolean;
  pagePath: string | null;
  trails: Map<string, string>;
  run: Run;
  onRefresh: () => Promise<void>;
  onOpenPage: (path: string) => void;
  onClosePage: () => void;
  onClose: () => void;
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
  run,
  onRefresh,
  onOpenPage,
  onClosePage,
  onClose,
  onNewPage,
  onReview,
  onNewPublication,
}: Props) {
  const { t } = useTranslation();
  const isWorkspace = !personal;
  const hasPublication = Boolean(payload.publication);
  const needsPublication = isWorkspace && !hasPublication;
  const publicationMode = isWorkspace && hasPublication;

  const { selected, count, empty, title, trailFor, onToggle, onDiscard } = useDraftPaneController({
    payload,
    personal,
    pagePath,
    trails,
    run,
    onRefresh,
    onOpenPage,
    onClosePage,
  });

  if (needsPublication && empty) {
    return (
      <>
        <PaneHeader title={title} />
        <ScrollShadow className="min-h-0 flex-1 [--scroll-shadow-scrollbar-size:0px]">
          <DraftEmpty needsPublication onNewPage={onNewPage} onNewPublication={onNewPublication} onClose={onClose} />
        </ScrollShadow>
      </>
    );
  }

  return (
    <>
      <PaneHeader title={title}>
        {!empty ? (
          <Chip size="sm" variant="soft" color="accent">
            <Chip.Label>
              {t("home.drafts.modifiedCount", { count: payload.drafts.length })}
            </Chip.Label>
          </Chip>
        ) : null}
      </PaneHeader>
      <ScrollShadow className="min-h-0 flex-1 [--scroll-shadow-scrollbar-size:0px]">
        {empty ? (
          <DraftEmpty onNewPage={onNewPage} onClose={onClose} />
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
      {!empty && (personal || !publicationMode) ? (
        <Card.Footer className="px-4 pb-4">
          {personal ? (
            <Description className="text-muted">{t("home.drafts.publishHint")}</Description>
          ) : (
            <Button variant="primary" fullWidth isDisabled={busy || count === 0} onPress={onReview}>
              <IconMerge />
              {t("home.drafts.sendCount", { count })}
            </Button>
          )}
        </Card.Footer>
      ) : null}
    </>
  );
}
