import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconMerge } from "../../../../../components/icons";

type Props = {
  busy?: boolean;
  canSendReview: boolean;
  onReview: () => void;
};

export function DraftSendButton({ busy = false, canSendReview, onReview }: Props) {
  const { t } = useTranslation();

  return (
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      aria-label={t("home.publication.sendReview")}
      isDisabled={busy || !canSendReview}
      onPress={onReview}
    >
      <IconMerge size={16} />
    </Button>
  );
}
