import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconChat } from "../../../../../components/icons";

type Props = {
  open: boolean;
  onToggle: () => void;
};

export function Launcher({ open, onToggle }: Props) {
  const { t } = useTranslation();
  return (
    <Button
      isIconOnly
      size="lg"
      variant="primary"
      className="app-no-drag size-12 rounded-full"
      aria-label={open ? t("home.chat.bubble.close") : t("home.chat.bubble.open")}
      aria-pressed={open}
      onPress={onToggle}
    >
      <IconChat />
    </Button>
  );
}