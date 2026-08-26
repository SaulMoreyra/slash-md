import { Card, Skeleton, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";

export function Status() {
  const { t } = useTranslation();
  return (
    <Card.Content
      className="flex flex-col items-center gap-5 px-6 pb-8 pt-2"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner aria-hidden />
      <div className="flex w-full flex-col gap-1 text-center">
        <p className="text-sm font-medium text-foreground">{t("app.loading")}</p>
        <p className="text-sm text-muted">{t("app.loadingHint")}</p>
      </div>
      <div className="flex w-full flex-col gap-2" aria-hidden>
        <Skeleton className="h-2.5 w-full rounded-full" />
        <Skeleton className="h-2.5 w-5/6 rounded-full" />
        <Skeleton className="h-2.5 w-2/3 rounded-full" />
      </div>
    </Card.Content>
  );
}

Status.displayName = "App.Loading.Status";
