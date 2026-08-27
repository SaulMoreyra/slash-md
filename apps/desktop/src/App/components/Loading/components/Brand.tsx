import { Card } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconSlash } from "../../../../components/icons";

export function Brand() {
  const { t } = useTranslation();

  return (
    <Card.Header className="flex items-center gap-3">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <IconSlash size={28} />
      </span>
      <Card.Title className="text-xl">{t("app.brand")}</Card.Title>
    </Card.Header>
  );
}

Brand.displayName = "App.Loading.Brand";
