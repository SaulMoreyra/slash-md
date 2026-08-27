import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconMerge } from "../../../../../components/icons";

type Props = {
  busy?: boolean;
  count: number;
  onPublish: () => void;
};

export function DraftPublishButton({ busy = false, count, onPublish }: Props) {
  const { t } = useTranslation();

  return (
    <Button variant="primary" fullWidth isDisabled={busy || count === 0} onPress={onPublish}>
      <IconMerge />
      {t("home.drafts.publishCount", { count })}
    </Button>
  );
}
