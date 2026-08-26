import { Alert, Chip, ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { HomeTreePayload } from "../../../../../shared/api";
import { PaneHeader } from "../PaneHeader";
import { InboxEmpty } from "./components/InboxEmpty";
import { InboxList } from "./components/InboxList";

type Props = {
  payload: HomeTreePayload;
  onOpenPage: (path: string, threadId?: string) => void;
};

export function InboxPane({ payload, onOpenPage }: Props) {
  const { t } = useTranslation();
  const title = t("home.inbox.title");
  const empty = payload.inbox.length === 0 && !payload.inboxError;

  return (
    <>
      <PaneHeader title={title}>
        {payload.inbox.length > 0 ? (
          <Chip size="sm" variant="soft" color="accent">
            <Chip.Label>{t("home.inbox.commentCount", { count: payload.inbox.length })}</Chip.Label>
          </Chip>
        ) : null}
      </PaneHeader>
      <ScrollShadow className="min-h-0 flex-1 [--scroll-shadow-scrollbar-size:0px]">
        {payload.inboxError ? (
          <Alert status="danger" className="mx-3 mb-2">
            <Alert.Content>
              <Alert.Description>{payload.inboxError}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
        {empty ? <InboxEmpty /> : <InboxList items={payload.inbox} listLabel={title} onOpenPage={onOpenPage} />}
      </ScrollShadow>
    </>
  );
}
