import type { PublicationSummary } from "@slash-md/core/homeTypes";
import { PublicationKind } from "../../../enums";
import { PublicationDraftMeta } from "./PublicationDraftMeta";
import { PublicationReviewMeta } from "./PublicationReviewMeta";

type Props = {
  pub: PublicationSummary;
};

export function PublicationRowMeta({ pub }: Props) {
  if (pub.kind === PublicationKind.InReview) {
    return <PublicationReviewMeta pub={pub} />;
  }
  if (pub.kind === PublicationKind.Draft) {
    return <PublicationDraftMeta pub={pub} />;
  }
  return null;
}
