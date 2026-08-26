import type { TFunction } from "i18next";
import type { HomeTreePayload } from "../../../../../../shared/api";

export function prStatusParts(
  review: NonNullable<HomeTreePayload["loteReview"]>,
  t: TFunction,
): string[] {
  const approvals =
    review.approvals > 0
      ? t("home.pr.approvals", { count: review.approvals })
      : t("home.pr.waitingApproval");

  let checks: string;
  if (review.checksOk === true) {
    checks = t("home.pr.checksOk");
  } else if (review.checksOk === false) {
    checks = t("home.pr.checksFailing");
  } else {
    checks = t("home.pr.checksPending");
  }

  return [approvals, checks];
}
