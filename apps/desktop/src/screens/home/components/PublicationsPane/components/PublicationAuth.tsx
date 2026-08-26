import { Alert, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

type Props = {
  onSignIn: () => void;
};

export function PublicationAuth({ onSignIn }: Props) {
  const { t } = useTranslation();
  return (
    <Alert status="warning" className="mx-3">
      <Alert.Content>
        <Alert.Description>{t("home.reviews.needsAuth")}</Alert.Description>
        <Button size="sm" variant="ghost" onPress={onSignIn}>
          {t("home.account.signIn")}
        </Button>
      </Alert.Content>
    </Alert>
  );
}
