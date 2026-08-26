import { Button, Card, Description, EmptyState } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { CreateIntent } from "../../enums";

type Props = {
  title: string;
  createIntent?: CreateIntent;
  onWriteCover: () => void;
  onNewPage: () => void;
};

export function SectionCanvas({
  title,
  createIntent = CreateIntent.Page,
  onWriteCover,
  onNewPage,
}: Props) {
  const { t } = useTranslation();
  const createLabel =
    createIntent === CreateIntent.Template ? t("home.nav.newTemplate") : t("home.nav.newPage");

  return (
    <EmptyState className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <Card.Title className="text-xl">{title}</Card.Title>
      <Description className="max-w-sm">{t("home.section.emptyBody")}</Description>
      <div className="flex flex-col items-center gap-2">
        <Button variant="primary" onPress={onWriteCover}>
          {t("home.section.writeCover")}
        </Button>
        <Button variant="ghost" onPress={onNewPage}>
          {createLabel}
        </Button>
      </div>
    </EmptyState>
  );
}
