import { shortDraftPath } from "@slash-md/ui/home/utils/format";
import { useTranslation } from "react-i18next";
import type { LocalDraft, LoteReviewSummary } from "@slash-md/core/homeTypes";
import type { HomeTreePayload } from "../../../../../../shared/api";
import { inReviewDrafts, loteReviewFromPayload } from "../../../utils";
import { PrStrip } from "../../PrStrip";
import { PublicationAuth } from "./PublicationAuth";
import { ReviewPageList } from "./ReviewPageList";

type Props = {
  payload: HomeTreePayload;
  pagePath: string | null;
  trails: Map<string, string>;
  onOpenPage: (path: string) => void;
  onSignIn: () => void;
};

export function PublicationReview({ payload, pagePath, trails, onOpenPage, onSignIn }: Props) {
  const reviewing = inReviewDrafts(payload);
  const review = loteReviewFromPayload(payload);

  if (!payload.needsAuth && !review && reviewing.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {payload.needsAuth ? <PublicationAuth onSignIn={onSignIn} /> : null}
      <PublicationPr review={review} />
      <PublicationPages
        drafts={reviewing}
        pagePath={pagePath}
        trails={trails}
        contentPath={payload.contentPath}
        onOpenPage={onOpenPage}
      />
    </div>
  );
}

function PublicationPr({ review }: { review: LoteReviewSummary | undefined }) {
  if (!review) {
    return null;
  }
  return (
    <div className="px-3">
      <PrStrip review={review} />
    </div>
  );
}

function PublicationPages({
  drafts,
  pagePath,
  trails,
  contentPath,
  onOpenPage,
}: {
  drafts: LocalDraft[];
  pagePath: string | null;
  trails: Map<string, string>;
  contentPath: string;
  onOpenPage: (path: string) => void;
}) {
  const { t } = useTranslation();

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="px-4 pb-1 text-[11px] font-medium text-muted">{t("home.reviews.pages")}</p>
      <ReviewPageList
        drafts={drafts}
        listLabel={t("home.reviews.pages")}
        pagePath={pagePath}
        trailFor={(path) => trails.get(path) || shortDraftPath(path, contentPath)}
        onOpenPage={onOpenPage}
      />
    </div>
  );
}
