import type { TFunction } from "i18next";
import { Button, Card } from "@heroui/react";
import type { LoteReviewSummary } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { IconBranch, IconCheck, IconClose, IconHistory } from "../../../../components/icons";
import { PrCheckStatus } from "../../enums";
import { prCheckStatus } from "../../utils";
import { PrStatusCell } from "./components/PrStatusCell";

const api = () => window.slashmd;

type Props = {
  review: LoteReviewSummary;
};

export function PrStrip({ review }: Props) {
  const { t } = useTranslation();
  const checks = prCheckStatus(review.checksOk);
  const waiting = review.approvals === 0;
  const reviewers = review.reviewers.join(", ");

  return (
    <Card className="rounded-2xl border border-separator bg-default/40" aria-label={t("home.pr.aria")}>
      <Card.Header className="gap-1">
        <p className="text-[11px] font-medium text-muted">{t("home.pr.kicker")}</p>
        <p className="font-mono text-xs font-medium">{t("home.pr.number", { number: review.prNumber })}</p>
        <Card.Title className="min-w-0 truncate text-sm" title={review.title}>
          {review.title}
        </Card.Title>
        {review.branch ? (
          <p className="flex min-w-0 items-center gap-1 font-mono text-[11px] text-muted" title={review.branch}>
            <IconBranch size={12} />
            <span className="truncate">{review.branch}</span>
          </p>
        ) : null}
        {reviewers ? (
          <p className="min-w-0 truncate text-[11px] text-muted" title={reviewers}>
            {t("home.pr.reviewers", { names: reviewers })}
          </p>
        ) : null}
      </Card.Header>
      <div className="grid grid-cols-2 gap-2 px-3 pb-2">
        <PrStatusCell
          label={t("home.pr.approvalsLabel")}
          value={waiting ? t("home.pr.waitingApproval") : t("home.pr.approvals", { count: review.approvals })}
          tone={waiting ? "default" : "success"}
          icon={waiting ? undefined : <IconCheck size={14} />}
        />
        <PrStatusCell
          label={t("home.pr.checksLabel")}
          value={checkLabel(checks, t)}
          tone={checkTone(checks)}
          icon={checkIcon(checks)}
        />
      </div>
      <Card.Footer className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onPress={() => void api().openUrl(review.prUrl)}>
          {t("home.pr.openPr")}
        </Button>
      </Card.Footer>
    </Card>
  );
}

function checkLabel(status: PrCheckStatus, t: TFunction) {
  if (status === PrCheckStatus.Ok) {
    return t("home.pr.checksOkShort");
  }
  if (status === PrCheckStatus.Failing) {
    return t("home.pr.checksFailShort");
  }
  return t("home.pr.checksPendingShort");
}

function checkTone(status: PrCheckStatus): "success" | "danger" | "warning" {
  if (status === PrCheckStatus.Ok) {
    return "success";
  }
  if (status === PrCheckStatus.Failing) {
    return "danger";
  }
  return "warning";
}

function checkIcon(status: PrCheckStatus) {
  if (status === PrCheckStatus.Ok) {
    return <IconCheck size={14} />;
  }
  if (status === PrCheckStatus.Failing) {
    return <IconClose size={14} />;
  }
  return <IconHistory size={14} />;
}
