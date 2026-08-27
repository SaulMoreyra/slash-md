import { Card, Skeleton } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { HomeTreePayload } from "../../../../../shared/api";
import { NavKind } from "../../enums";
import type { ConflictsApi } from "../../hooks/useConflicts";
import type { DiscardPublicationTarget, NavView, RunOp } from "../../types";
import { ConflictPane } from "../ConflictPane";
import { DraftPane } from "../DraftPane";
import { InboxPane } from "../InboxPane";
import { PaneChrome, PaneHeader } from "../PaneHeader";
import { PublicationsPane } from "../PublicationsPane";
import { LeaveWikiFooter } from "./components/LeaveWikiFooter";

type Props = {
  nav: NavView;
  payload: HomeTreePayload | null;
  personal: boolean;
  busy: boolean;
  pagePath: string | null;
  trails: Map<string, string>;
  runOp: RunOp;
  onRefresh: () => Promise<void>;
  onOpenPage: (path: string, threadId?: string) => void;
  onClosePage: () => void;
  onReview: () => void;
  onLeave: () => void;
  onPublish: () => void;
  onLand: () => void;
  onLandOther: (branch: string) => void;
  onRequestDiscard: (target: DiscardPublicationTarget) => void;
  onSignIn: () => void;
  onNewPage: () => void;
  onClosePane: () => void;
  onNewPublication?: () => void;
  conflicts?: ConflictsApi;
};

export function WorkPane(props: Props) {
  const showLeaveFooter = shouldShowLeaveFooter(props.nav, props.payload);

  return (
    <PaneChrome onClose={props.onClosePane}>
      <div
        key={workPaneKey(props.nav, props.payload)}
        className="flex min-h-0 flex-1 flex-col animate-fade-in motion-reduce:animate-none"
      >
        <WorkPaneBody {...props} />
        {showLeaveFooter ? (
          <LeaveWikiFooter busy={props.busy} onLeave={props.onLeave} />
        ) : null}
      </div>
    </PaneChrome>
  );
}

function shouldShowLeaveFooter(nav: NavView, payload: HomeTreePayload | null) {
  if (!payload || payload.needsInit) {
    return false;
  }
  if (nav.kind === NavKind.Conflicts) {
    return false;
  }
  return Boolean(payload.publication);
}

function workPaneKey(nav: NavView, payload: HomeTreePayload | null) {
  if (!payload) return "loading";
  if (payload.needsInit) return "init";
  return nav.kind;
}

function WorkPaneBody({
  nav,
  payload,
  personal,
  busy,
  pagePath,
  trails,
  runOp,
  onRefresh,
  onOpenPage,
  onClosePage,
  onReview,
  onLeave,
  onPublish,
  onLand,
  onLandOther,
  onRequestDiscard,
  onSignIn,
  onNewPage,
  onNewPublication,
  conflicts,
}: Props) {
  const { t } = useTranslation();

  if (!payload) {
    return (
      <>
        <PaneHeader title={t("home.nav.drafts")} />
        <Card.Content className="flex flex-col gap-2 px-4 pb-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-4/5 rounded-xl" />
          <p className="text-sm text-muted">{t("common.loading")}</p>
        </Card.Content>
      </>
    );
  }

  if (payload.needsInit) {
    return (
      <>
        <PaneHeader title={t("home.nav.workspace")} />
        <Card.Content className="px-4 pb-4">
          <p className="text-sm text-muted">{t("home.work.initListHint")}</p>
        </Card.Content>
      </>
    );
  }

  if (nav.kind === NavKind.Inbox) {
    return <InboxPane payload={payload} onOpenPage={onOpenPage} />;
  }
  if (nav.kind === NavKind.Conflicts && conflicts) {
    return (
      <ConflictPane
        files={conflicts.files}
        decided={conflicts.decided}
        selectedPath={conflicts.selectedPath}
        canFinish={conflicts.canFinish}
        remainingCount={conflicts.remainingCount}
        totalCount={conflicts.totalCount}
        busy={busy}
        onSelect={conflicts.onSelect}
        onRequestAbort={conflicts.onRequestAbort}
        onFinish={() => void conflicts.onFinish()}
      />
    );
  }
  if (nav.kind === NavKind.Publications) {
    return (
      <PublicationsPane
        payload={payload}
        busy={busy}
        pagePath={pagePath}
        trails={trails}
        runOp={runOp}
        onRefresh={onRefresh}
        onOpenPage={onOpenPage}
        onSignIn={onSignIn}
        onNewPublication={() => onNewPublication?.()}
        onReview={onReview}
        onLeave={onLeave}
        onPublish={onPublish}
        onLand={onLand}
        onLandOther={onLandOther}
        onRequestDiscard={onRequestDiscard}
      />
    );
  }

  return (
    <DraftPane
      payload={payload}
      personal={personal}
      busy={busy}
      pagePath={pagePath}
      trails={trails}
      runOp={runOp}
      onRefresh={onRefresh}
      onOpenPage={onOpenPage}
      onClosePage={onClosePage}
      onNewPage={onNewPage}
      onReview={onReview}
      onNewPublication={onNewPublication}
    />
  );
}
