import { useState } from "react";
import { Button, Modal as HeroModal, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconFolder, IconPage } from "../../../../components/icons";
import { TreeEntryKind } from "../../enums";
import type { ModalTarget } from "../../types";

type Props = {
  target: ModalTarget;
  busy?: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function RenameModal({ target, busy = false, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(target.title);
  const trimmed = name.trim();
  const isFolder = target.kind === TreeEntryKind.Folder;
  const submitLabel = busy ? t("common.saving") : t("common.save");

  function submit() {
    if (!trimmed || busy) {
      return;
    }
    onSave(trimmed);
  }

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
            <HeroModal.Heading>
              {isFolder ? t("home.modals.rename.titleFolder") : t("home.modals.rename.titleFile")}
            </HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex flex-col gap-6 px-8 py-10">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-muted">{isFolder ? <IconFolder size={28} /> : <IconPage size={28} />}</span>
              <div className="min-w-0 flex-1">
                <input
                  className="w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted/40"
                  value={name}
                  placeholder={
                    isFolder
                      ? t("home.modals.rename.placeholderFolder")
                      : t("home.modals.rename.placeholderFile")
                  }
                  aria-label={t("home.modals.rename.name")}
                  autoFocus
                  disabled={busy}
                  onChange={(ev) => setName(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      submit();
                    }
                  }}
                />
                <p className="mt-2 text-sm text-muted">
                  {isFolder ? t("home.modals.rename.hintFolder") : t("home.modals.rename.hintFile")}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" isDisabled={busy} onPress={onClose}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" isDisabled={!trimmed || busy} onPress={submit}>
                {busy ? <Spinner size="sm" aria-hidden /> : null}
                {submitLabel}
              </Button>
            </div>
          </HeroModal.Body>
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  );
}
