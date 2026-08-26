import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconMerge } from "../../../icons";
import type { ReviewModalHub } from "../types";

type Props = {
  canSend: boolean;
  hub?: ReviewModalHub;
  onClose: () => void;
  onSend: () => void;
};

export function ReviewModalActions({ canSend, hub, onClose, onSend }: Props) {
  const { t } = useTranslation();
  const showPublish = Boolean(hub?.showPublish);
  const showLeave = Boolean(hub?.showLeave);
  const sendDisabled = !canSend || Boolean(hub?.busy);

  return (
    <div className="hang-actions">
      <Button variant="ghost" onPress={onClose}>
        {t("common.cancel")}
      </Button>
      {showLeave ? (
        <Button variant="ghost" isDisabled={hub?.busy} onPress={hub?.onLeave}>
          {t("home.publication.leave")}
        </Button>
      ) : null}
      {showPublish ? (
        <Button
          variant="ghost"
          isDisabled={hub?.busy || !hub?.publishReady}
          aria-label={
            hub?.publishHint
              ? `${t("home.publication.publish")}. ${hub.publishHint}`
              : undefined
          }
          onPress={hub?.onPublish}
        >
          {t("home.publication.publish")}
        </Button>
      ) : null}
      <Button variant="primary" isDisabled={sendDisabled} onPress={onSend}>
        <IconMerge size={14} />
        {t("modal.review.send")}
      </Button>
    </div>
  );
}
