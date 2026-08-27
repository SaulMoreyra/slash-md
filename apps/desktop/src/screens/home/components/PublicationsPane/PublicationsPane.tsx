import { Button, ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconPlus } from "../../../../components/icons";
import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { AppOperation } from "../../../../App/enums";
import type { HomeTreePayload } from "../../../../../shared/api";
import type { DiscardPublicationTarget, RunOp } from "../../types";
import { PublicationKind } from "../../enums";
import {
  isPublicationsPaneEmpty,
  publicationChangeCount,
  publicationCta,
  publicationRowsForList,
  publicationStatusLine,
  publicationStatusTone,
} from "../../utils";
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
  runOp: RunOp;
  onRefresh: () => Promise<void>;
  onOpenPage: (path: string) => void;
  onSignIn: () => void;
  onNewPublication: () => void;
  onReview: () => void;
  onLeave: () => void;
  onPublish: () => void;
  onLand: () => void;
  onLandOther: (branch: string) => void;
  onRequestDiscard: (target: DiscardPublicationTarget) => void;
};

export function PublicationsPane({
  payload,
  busy,
  pagePath,
  trails,
  runOp,
  onRefresh,
  onOpenPage,
  onSignIn,
  onNewPublication,
  onReview,
  onLeave,
  onPublish,
  onLand,
  onLandOther,
  onRequestDiscard,
}: Props) {
  const { t } = useTranslation();
  const pubs = payload.publications ?? [];
  const current = payload.publication;
  const listPubs = publicationRowsForList(pubs, Boolean(current));
  const empty = isPublicationsPaneEmpty(payload);
  const statusLine = current
    ? publicationStatusLine(t, {
        kind: current.kind,
        canSendReview: Boolean(payload.canSendReview),
        wikiSyncStatus: payload.wikiSyncStatus,
        loteReview: payload.loteReview,
      })
    : null;
  const statusTone = current
    ? publicationStatusTone({
        kind: current.kind,
        canSendReview: Boolean(payload.canSendReview),
        wikiSyncStatus: payload.wikiSyncStatus,
        loteReview: payload.loteReview,
      })
    : publicationStatusTone({ kind: PublicationKind.Draft, canSendReview: false });
  const currentSummary = current ? pubs.find((pub) => pub.branch === current.branch) : undefined;
  const changeCount = current
    ? publicationChangeCount({
        drafts: payload.drafts.length,
        kind: current.kind,
        canSendReview: Boolean(payload.canSendReview),
        wikiSyncStatus: payload.wikiSyncStatus,
      })
    : 0;
  const cta = current
    ? publicationCta({
        kind: current.kind,
        canSendReview: Boolean(payload.canSendReview),
        canPublishBatch: Boolean(payload.canPublishBatch),
        wikiSyncStatus: payload.wikiSyncStatus,
        loteReview: payload.loteReview,
      })
    : publicationCta({ canSendReview: false, canPublishBatch: false });
  const prUrl = payload.loteReview?.prUrl ?? current?.prUrl;
  const canDiscardCurrent = Boolean(
    current &&
      current.kind !== PublicationKind.Published &&
      (payload.publications ?? []).some((pub) => pub.branch === current.branch),
  );

  function discardTarget(input: {
    branch: string;
    title: string;
    kind: string;
    prNumber?: number;
    mounted: boolean;
  }): DiscardPublicationTarget {
    return {
      ...input,
      dirtyCount: input.mounted ? payload.drafts.length : 0,
    };
  }

  function onDiscardCurrent() {
    if (!current) {
      return;
    }
    requestDiscard(
      discardTarget({
        branch: current.branch,
        title: current.title,
        kind: current.kind,
        prNumber: current.prNumber,
        mounted: true,
      }),
    );
  }

  function onDiscardOther(pub: PublicationSummary) {
    requestDiscard(
      discardTarget({
        branch: pub.branch,
        title: pub.title,
        kind: pub.kind,
        prNumber: pub.prNumber,
        mounted: pub.mounted,
      }),
    );
  }

  function requestDiscard(target: DiscardPublicationTarget) {
    if (target.kind === PublicationKind.InReview && payload.needsAuth) {
      onSignIn();
      return;
    }
    onRequestDiscard(target);
  }

  async function onResume(branch: string) {
    await runOp(AppOperation.ResumePublication, async () => {
      await api().resumePublication(branch);
      await onRefresh();
    });
  }

  return (
    <>
      <PaneHeader title={t("home.publication.listTitle")}>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t("home.publication.new")}
          isDisabled={busy}
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
            {current ? (
              <CurrentPublication
                publication={current}
                statusLine={statusLine}
                statusTone={statusTone}
                changeCount={changeCount}
                cta={cta}
                busy={busy}
                prUrl={prUrl}
                summary={currentSummary}
                reviewers={payload.loteReview?.reviewerPeople}
                commenters={currentSummary?.commenters}
                onReview={onReview}
                onLeave={onLeave}
                onPublish={onPublish}
                onLand={onLand}
                onDiscard={canDiscardCurrent ? onDiscardCurrent : undefined}
              />
            ) : null}
            <PublicationReview
              payload={payload}
              pagePath={pagePath}
              trails={trails}
              onOpenPage={onOpenPage}
              onSignIn={onSignIn}
            />
            <OtherPublications
              current={Boolean(current)}
              pubs={listPubs}
              busy={busy}
              onResume={onResume}
              onLand={onLandOther}
              onDiscard={onDiscardOther}
            />
          </>
        )}
      </ScrollShadow>
    </>
  );
}
