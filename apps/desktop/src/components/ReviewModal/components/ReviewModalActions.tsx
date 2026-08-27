import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconMerge } from "../../icons";
import type { ReviewModalHub } from "../types";

type Props = {
  canSend: boolean;
  hub?: ReviewModalHub;
  onClose: () => void;
  onSend: () => void;
};

export function ReviewModalActions({ canSend, hub, onClose, onSend }: Props) {
  const { t } = useTranslation();
  const busy = Boolean(hub?.busy);

  return (
    <div className="hang-actions">
      <Button variant="ghost" onPress={onClose}>
        {t("common.cancel")}
      </Button>
      {canSend ? (
        <Button variant="primary" isDisabled={busy} onPress={onSend}>
          <IconMerge size={14} />
          {t("modal.review.send")}
        </Button>
      ) : null}
    </div>
  );
}
