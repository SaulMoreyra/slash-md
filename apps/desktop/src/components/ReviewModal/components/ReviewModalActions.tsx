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
  const showLeave = Boolean(hub?.showLeave);
  const showPublish = Boolean(hub?.showPublish);
  const showSend = canSend;

  return (
    <div className="hang-actions">
      <Button variant="ghost" onPress={onClose}>
        {t("common.cancel")}
      </Button>
      {showLeave ? (
        <Button variant="ghost" isDisabled={busy} onPress={hub?.onLeave}>
          {t("home.publication.leave")}
        </Button>
      ) : null}
      {showPublish ? (
        <Button
          variant={showSend ? "ghost" : "primary"}
          isDisabled={busy}
          onPress={hub?.onPublish}
        >
          {t("home.publication.publish")}
        </Button>
      ) : null}
      {showSend ? (
        <Button variant="primary" isDisabled={busy} onPress={onSend}>
          <IconMerge size={14} />
          {t("modal.review.send")}
        </Button>
      ) : null}
    </div>
  );
}
