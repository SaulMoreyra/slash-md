import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { IconBranch, IconCheckCircle } from "../../../../../components/icons";
import { CommenterAvatars } from "./CommenterAvatars";

type Props = {
  pub: PublicationSummary;
};

export function PublicationReviewMeta({ pub }: Props) {
  const commenters = pub.commenters ?? [];

  return (
    <div className="mt-1.5 flex min-w-0 flex-col items-start gap-1">
      <p className="flex min-w-0 items-center gap-1 font-mono text-[11px] text-muted" title={pub.branch}>
        <IconBranch size={11} />
        <span className="truncate">{pub.branch}</span>
      </p>
      <div className="flex min-w-0 items-center gap-2">
        <ApprovalStatus approved={pub.approved} />
        <CommenterAvatars commenters={commenters} />
      </div>
    </div>
  );
}

function ApprovalStatus({ approved }: { approved: boolean | undefined }) {
  const { t } = useTranslation();
  if (approved === true) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-success">
        <IconCheckCircle size={12} />
        {t("home.publication.rowApproved")}
      </span>
    );
  }
  if (approved === false) {
    return <span className="text-[11px] text-muted">{t("home.publication.rowAwaitingApproval")}</span>;
  }
  return null;
}
