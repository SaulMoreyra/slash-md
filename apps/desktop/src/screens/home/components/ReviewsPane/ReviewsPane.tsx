import { ScrollShadow } from "@heroui/react";
import { shortDraftPath } from "@slash-md/ui/home/utils/format";
import { useTranslation } from "react-i18next";
import type { HomeTreePayload } from "../../../../../shared/api";
import { loteReviewFromPayload } from "../../utils";
import { PaneHeader } from "../PaneHeader";
import { PrStrip } from "../PrStrip";
import { ReviewPageList } from "./components/ReviewPageList";
import { ReviewsAuth } from "./components/ReviewsAuth";
import { ReviewsEmpty } from "./components/ReviewsEmpty";
import { ReviewsPublishHint } from "./components/ReviewsPublishHint";

type Props = {
  payload: HomeTreePayload;
  pagePath: string | null;
  trails: Map<string, string>;
  onOpenPage: (path: string) => void;
  onSignIn: () => void;
};

export function ReviewsPane({ payload, pagePath, trails, onOpenPage, onSignIn }: Props) {
  const { t } = useTranslation();
  const reviewing = payload.drafts.filter((draft) => draft.badge === "in review");
  const review = loteReviewFromPayload(payload);
  const empty = reviewing.length === 0 && !review;
  const title = t("home.reviews.title");
  const showHint = !review && payload.canPublishBatch;
  const showPages = reviewing.length > 0;

  function trailFor(path: string) {
    return trails.get(path) || shortDraftPath(path, payload.contentPath);
  }

  return (
    <>
      <PaneHeader title={title} />
      <ScrollShadow className="min-h-0 flex-1 space-y-3 [--scroll-shadow-scrollbar-size:0px]">
        {payload.needsAuth ? <ReviewsAuth onSignIn={onSignIn} /> : null}
        {review ? (
          <div className="px-3">
            <PrStrip review={review} />
          </div>
        ) : null}
        {showHint ? <ReviewsPublishHint /> : null}
        {empty ? <ReviewsEmpty /> : null}
        {showPages ? (
          <div>
            {review ? (
              <p className="px-4 pb-1 text-[11px] font-medium text-muted">
                {t("home.reviews.pages")}
              </p>
            ) : null}
            <ReviewPageList
              drafts={reviewing}
              listLabel={t("home.reviews.pages")}
              pagePath={pagePath}
              trailFor={trailFor}
              onOpenPage={onOpenPage}
            />
          </div>
        ) : null}
      </ScrollShadow>
    </>
  );
}
