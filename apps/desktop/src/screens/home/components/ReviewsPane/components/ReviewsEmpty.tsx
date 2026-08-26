import { useTranslation } from "react-i18next";
import { IconReviews } from "../../../../../components/icons";
import { PaneEmpty } from "../../PaneEmpty";

export function ReviewsEmpty() {
  const { t } = useTranslation();
  return (
    <PaneEmpty
      icon={<IconReviews size={22} />}
      title={t("home.reviews.emptyTitle")}
      body={t("home.reviews.emptyBody")}
    />
  );
}
