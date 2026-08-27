import type { PublicationCommenter, PublicationSummary } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { IconChat, IconCheckCircle, IconClose } from "../../../../../components/icons";
import { PublicationKind, PublicationStatusTone } from "../../../enums";
import { PublicationDraftMeta } from "./PublicationDraftMeta";
import { PublicationPeopleRow } from "./PublicationPeopleRow";

const TONE_CLASS: Record<PublicationStatusTone, string> = {
  [PublicationStatusTone.Default]: "bg-default/50 text-foreground",
  [PublicationStatusTone.Warning]: "bg-warning/15 text-warning",
  [PublicationStatusTone.Success]: "bg-success/15 text-success",
  [PublicationStatusTone.Danger]: "bg-danger/15 text-danger",
};

type Props = {
  kind: string;
  statusLine: string | null;
  statusTone: PublicationStatusTone;
  changeCount: number;
  summary?: PublicationSummary;
  reviewers: PublicationCommenter[];
  commenters: PublicationCommenter[];
};

export function CurrentPublicationMeta({
  kind,
  statusLine,
  statusTone,
  changeCount,
  summary,
  reviewers,
  commenters,
}: Props) {
  const inReview = kind === PublicationKind.InReview;
  const showWell = Boolean(statusLine) || inReview;
  const showChanges = changeCount > 0;
  const showDraftStats = kind === PublicationKind.Draft && Boolean(summary);
  if (!showWell && !showChanges && !showDraftStats) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3 pt-0">
      {showWell ? (
        <StatusWell
          statusLine={statusLine}
          statusTone={statusTone}
          inReview={inReview}
          reviewers={reviewers}
          commenters={commenters}
        />
      ) : null}
      {showChanges ? (
        <p className="text-[11px] text-muted">
          <ChangeCount count={changeCount} />
        </p>
      ) : null}
      {showDraftStats && summary ? <PublicationDraftMeta pub={summary} className="" /> : null}
    </div>
  );
}

function StatusWell({
  statusLine,
  statusTone,
  inReview,
  reviewers,
  commenters,
}: {
  statusLine: string | null;
  statusTone: PublicationStatusTone;
  inReview: boolean;
  reviewers: PublicationCommenter[];
  commenters: PublicationCommenter[];
}) {
  const { t } = useTranslation();
  const names = (people: PublicationCommenter[]) => people.map((person) => `@${person.login}`).join(", ");

  return (
    <div className={`flex flex-col gap-2 rounded-xl px-3 py-2.5 ${TONE_CLASS[statusTone]}`}>
      {statusLine ? (
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <StatusIcon tone={statusTone} />
          {statusLine}
        </p>
      ) : null}
      {inReview ? (
        <div className="flex flex-col gap-1.5 text-foreground">
          <PublicationPeopleRow
            label={t("home.publication.reviewersLabel")}
            empty={t("home.publication.reviewersEmpty")}
            people={reviewers}
            ariaLabel={t("home.publication.reviewersAria", { names: names(reviewers) })}
          />
          <PublicationPeopleRow
            label={t("home.publication.commentsLabel")}
            empty={t("home.publication.commentsEmpty")}
            people={commenters}
            ariaLabel={t("home.publication.commentersAria", { names: names(commenters) })}
          />
        </div>
      ) : null}
    </div>
  );
}

function StatusIcon({ tone }: { tone: PublicationStatusTone }) {
  if (tone === PublicationStatusTone.Success) {
    return <IconCheckCircle size={14} />;
  }
  if (tone === PublicationStatusTone.Danger) {
    return <IconClose size={14} />;
  }
  if (tone === PublicationStatusTone.Warning) {
    return <IconChat size={14} />;
  }
  return null;
}

function ChangeCount({ count }: { count: number }) {
  const { t } = useTranslation();
  return <>{t("home.publication.changesCount", { count })}</>;
}
