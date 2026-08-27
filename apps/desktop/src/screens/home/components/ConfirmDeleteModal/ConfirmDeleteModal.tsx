import { Button, Modal as HeroModal, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { TreeEntryKind } from "../../enums";
import type { ModalTarget } from "../../types";
import { DeleteTarget } from "./components/DeleteTarget";

type Props = {
  target: ModalTarget;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({ target, busy = false, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const isFolder = target.kind === TreeEntryKind.Folder;
  const heading = isFolder ? t("home.modals.delete.titleFolder") : t("home.modals.delete.titleFile");
  const lede = isFolder ? t("home.modals.delete.ledeFolder") : t("home.modals.delete.ledeFile");
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
          <HeroModal.Header className="sr-only">
            <HeroModal.Heading>{heading}</HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex flex-col gap-8 px-8 py-10">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{heading}</p>
              <p className="mt-2 text-sm text-muted">{lede}</p>
            </div>
            <DeleteTarget title={target.title} kind={target.kind} />
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
