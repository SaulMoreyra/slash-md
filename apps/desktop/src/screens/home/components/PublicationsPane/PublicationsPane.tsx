import { Button, ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconPlus } from "../../../../components/icons";
import type { HomeTreePayload } from "../../../../../shared/api";
import type { Run } from "../../types";
import { isPublicationsPaneEmpty, publicationRowsForList } from "../../utils";
import { PaneHeader } from "../PaneHeader";
import { CurrentPublication } from "./components/CurrentPublication";
import { OtherPublications } from "./components/OtherPublications";
import { PublicationReview } from "./components/PublicationReview";
import { PublicationsEmpty } from "./components/PublicationsEmpty";

const api = () => window.slashmd;

type Props = {
  payload: HomeTreePayload;
  busy: boolean;
  pagePath: string | null;
  trails: Map<string, string>;
  run: Run;
  onRefresh: () => Promise<void>;
  onOpenPage: (path: string) => void;
  onSignIn: () => void;
  onNewPublication: () => void;
};

export function PublicationsPane({
  payload,
  busy,
  pagePath,
  trails,
  run,
  onRefresh,
  onOpenPage,
  onSignIn,
  onNewPublication,
}: Props) {
  const { t } = useTranslation();
  const pubs = payload.publications ?? [];
  const current = payload.publication;
  const listPubs = publicationRowsForList(pubs, Boolean(current));
  const empty = isPublicationsPaneEmpty(payload);

  async function onResume(branch: string) {
    await run(() => api().resumePublication(branch));
    await onRefresh();
  }

  return (
    <>
      <PaneHeader title={t("home.publication.listTitle")}>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t("home.publication.new")}
          onPress={onNewPublication}
        >
          <IconPlus size={16} />
        </Button>
      </PaneHeader>
      <ScrollShadow className="min-h-0 flex-1 space-y-3 pt-1 [--scroll-shadow-scrollbar-size:0px]">
        {empty ? (
          <PublicationsEmpty onNewPublication={onNewPublication} />
        ) : (
          <>
            {current ? <CurrentPublication publication={current} /> : null}
            <PublicationReview
              payload={payload}
              pagePath={pagePath}
              trails={trails}
              onOpenPage={onOpenPage}
              onSignIn={onSignIn}
            />
            <OtherPublications current={Boolean(current)} pubs={listPubs} busy={busy} onResume={onResume} />
          </>
        )}
      </ScrollShadow>
    </>
  );
}
