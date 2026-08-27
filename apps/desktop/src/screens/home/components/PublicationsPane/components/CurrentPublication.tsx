import { Card, Chip, toast } from "@heroui/react";
import type { PublicationCommenter, PublicationState, PublicationSummary } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { IconBranch } from "../../../../../components/icons";
import { PublicationCta, PublicationKind, PublicationStatusTone } from "../../../enums";
import { publicationChipColor, publicationKindLabel, copyToClipboard } from "../../../utils";
import { CurrentPublicationMeta } from "./CurrentPublicationMeta";
import { PublicationCtaButton } from "./PublicationCtaButton";
import { PublicationMenu } from "./PublicationMenu";

const api = () => window.slashmd;

type Props = {
  publication: PublicationState;
  statusLine: string | null;
  statusTone: PublicationStatusTone;
  changeCount: number;
  cta: PublicationCta;
  busy?: boolean;
  prUrl?: string;
  summary?: PublicationSummary;
  reviewers?: PublicationCommenter[];
  commenters?: PublicationCommenter[];
  onReview: () => void;
  onLeave: () => void;
  onPublish: () => void;
  onLand: () => void;
  onDiscard?: () => void;
};

export function CurrentPublication({
  publication,
  statusLine,
  statusTone,
  changeCount,
  cta,
  busy = false,
  prUrl,
  summary,
  reviewers = [],
  commenters = [],
  onReview,
  onLeave,
  onPublish,
  onLand,
  onDiscard,
}: Props) {
  const { t } = useTranslation();
  const showCta = cta !== PublicationCta.None;
  const showBranch = publication.kind === PublicationKind.InReview;

  async function onCopyBranch() {
    const copied = await copyToClipboard(publication.branch);
    if (!copied) {
      toast.danger(t("home.publication.copyFailed"));
    }
  }

  return (
    <Card
      className="mx-3 overflow-visible rounded-2xl border border-separator bg-default/40 shadow-none"
      aria-current="true"
      aria-label={t("home.publication.current")}
    >
      <Card.Header className="flex flex-col items-stretch gap-1.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-muted">{t("home.publication.current")}</p>
          <div className="flex shrink-0 items-center gap-1">
            <Chip size="sm" variant="soft" color={publicationChipColor(publication.kind)} className="shrink-0">
              <Chip.Label>{publicationKindLabel(t, publication.kind)}</Chip.Label>
            </Chip>
            <PublicationMenu
              title={publication.title}
              branch={publication.branch}
              prUrl={prUrl}
              busy={busy}
              onLeave={onLeave}
              onOpenGithub={prUrl ? () => void api().openUrl(prUrl) : undefined}
              onCopyBranch={() => void onCopyBranch()}
              onDiscard={onDiscard}
            />
          </div>
        </div>
        <Card.Title className="min-w-0 truncate text-[15px] font-semibold leading-snug" title={publication.title}>
          {publication.title}
        </Card.Title>
        {showBranch ? (
          <p className="flex min-w-0 items-center gap-1 font-mono text-[11px] text-muted" title={publication.branch}>
            <IconBranch size={11} />
            <span className="truncate">{publication.branch}</span>
          </p>
        ) : null}
      </Card.Header>
      <CurrentPublicationMeta
        kind={publication.kind}
        statusLine={statusLine}
        statusTone={statusTone}
        changeCount={changeCount}
        summary={summary}
        reviewers={reviewers}
        commenters={commenters}
      />
      {showCta ? (
        <Card.Footer className="px-3 pb-3 pt-0">
          <PublicationCtaButton cta={cta} busy={busy} onReview={onReview} onPublish={onPublish} onLand={onLand} />
        </Card.Footer>
      ) : null}
    </Card>
  );
}
