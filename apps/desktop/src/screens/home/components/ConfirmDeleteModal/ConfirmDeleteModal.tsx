import { Button, Modal as HeroModal, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { TreeEntryKind } from "../../enums";
import type { ModalTarget } from "../../types";

type Props = {
  target: ModalTarget;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({ target, busy = false, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const isFolder = target.kind === TreeEntryKind.Folder;
  const confirmLabel = busy ? t("common.deleting") : t("common.delete");

  return (
    <HeroModal.Backdrop
      isOpen
      isDismissable={!busy}
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
        }
      }}
    >
      <HeroModal.Container size="lg">
        <HeroModal.Dialog className="bg-surface" aria-busy={busy}>
          {busy ? null : <HeroModal.CloseTrigger />}
          <HeroModal.Header>
            <HeroModal.Heading>
              {isFolder ? t("home.modals.delete.titleFolder") : t("home.modals.delete.titleFile")}
            </HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex flex-col gap-6 px-8 pb-8">
            <p className="text-sm text-muted">
              {isFolder
                ? t("home.modals.delete.bodyFolder", { title: target.title })
                : t("home.modals.delete.bodyFile", { title: target.title })}
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" isDisabled={busy} onPress={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                className="bg-danger text-white"
                isDisabled={busy}
                onPress={onConfirm}
              >
                {busy ? <Spinner size="sm" aria-hidden /> : null}
                {confirmLabel}
              </Button>
            </div>
          </HeroModal.Body>
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  );
}
