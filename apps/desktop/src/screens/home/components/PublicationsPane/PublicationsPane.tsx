import { Button, ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconPlus } from "../../../../components/icons";
import type { HomeTreePayload } from "../../../../../shared/api";
import type { Run } from "../../types";
import { publicationRowsForList } from "../../utils";
import { PaneHeader } from "../PaneHeader";
import { CurrentPublication } from "./components/CurrentPublication";
import { PublicationList } from "./components/PublicationList";
import { PublicationsEmpty } from "./components/PublicationsEmpty";

const api = () => window.slashmd;

type Props = {
  payload: HomeTreePayload;
  busy: boolean;
  run: Run;
  onRefresh: () => Promise<void>;
  onNewPublication: () => void;
};

export function PublicationsPane({ payload, busy, run, onRefresh, onNewPublication }: Props) {
  const { t } = useTranslation();
  const pubs = payload.publications ?? [];
  const current = payload.publication;
  const listPubs = publicationRowsForList(pubs, Boolean(current));
  const empty = !current && pubs.length === 0;

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
            {listPubs.length > 0 ? (
              <div className="space-y-2">
                {current ? (
                  <p className="px-4 text-[11px] font-medium text-muted">
                    {t("home.publication.others")}
                  </p>
                ) : null}
                <PublicationList pubs={listPubs} busy={busy} onResume={onResume} />
              </div>
            ) : null}
          </>
        )}
      </ScrollShadow>
    </>
  );
}
