import { Card } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { NavKind } from "../../../enums";
import { WorkPane } from "../../WorkPane";
import { useHome } from "../context";

export function WorkColumn() {
  const { t } = useTranslation();
  const home = useHome();
  const { nav, library, pagePath, busy, runOp, actions, conflicts, onRefresh, onOpenPage, onClosePage } =
    home;

  if (!nav.workPaneOpen || nav.view.kind === NavKind.Folder) {
    return null;
  }

  return (
    <Card
      className="flex w-80 shrink-0 flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-surface p-0 shadow-none"
      aria-label={t("home.workList")}
    >
      <WorkPane
        nav={nav.view}
        payload={library.payload}
        personal={library.personal}
        busy={busy}
        pagePath={pagePath}
        trails={library.trails}
        runOp={runOp}
        onRefresh={onRefresh}
        onOpenPage={onOpenPage}
        onClosePage={onClosePage}
        onReview={actions.onRequestReview}
        onLeave={() => void actions.onLeavePublication()}
        onPublish={() => void actions.onPublishBatch()}
        onLand={() => void actions.onLandPublication()}
        onLandOther={(branch) => void actions.onLandPublication(branch)}
        onRequestDiscard={actions.onRequestDiscard}
        onSignIn={actions.onRequestSignIn}
        onNewPage={actions.onRequestNewPage}
        onClosePane={nav.onCloseWorkPane}
        onNewPublication={actions.onRequestPublication}
        conflicts={conflicts}
      />
    </Card>
  );
}
