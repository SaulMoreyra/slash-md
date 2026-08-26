import { Alert } from "@heroui/react";
import { useTranslation } from "react-i18next";

export function ReviewsPublishHint() {
  const { t } = useTranslation();
  return (
    <Alert status="accent" className="mx-3">
      <Alert.Content>
        <Alert.Description>{t("home.reviews.publishHint")}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
