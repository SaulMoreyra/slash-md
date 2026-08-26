import { Alert, Button, Card } from "@heroui/react";
import { useTranslation } from "react-i18next";

type Props = {
  message: string;
  onRetry: () => void;
};

export function Failure({ message, onRetry }: Props) {
  const { t } = useTranslation();
  return (
    <Card.Content className="flex flex-col gap-4 px-6 pb-8 pt-2">
      <Alert status="danger" role="alert">
        <Alert.Content>
          <Alert.Description>{message}</Alert.Description>
        </Alert.Content>
      </Alert>
      <Button variant="primary" onPress={onRetry}>
        {t("app.retry")}
      </Button>
    </Card.Content>
  );
}

Failure.displayName = "App.Loading.Failure";
