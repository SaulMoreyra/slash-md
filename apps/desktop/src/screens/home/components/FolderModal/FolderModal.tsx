import { useState } from "react";
import { Button, Modal as HeroModal, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { FolderDestination } from "./components/FolderDestination";

type Props = {
  parent?: string;
  busy?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
};

export function FolderModal({ parent, busy = false, onClose, onCreate }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const submitLabel = busy ? t("common.creating") : t("common.create");

  function submit() {
    if (!trimmed || busy) {
      return;
    }
    onCreate(trimmed);
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
            <HeroModal.Heading>{t("home.modals.folder.title")}</HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex flex-col gap-8 px-8 py-10">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {t("home.modals.folder.title")}
              </p>
              <p className="mt-2 text-sm text-muted">{t("home.modals.folder.lede")}</p>
            </div>
            <FolderDestination parent={parent} />
            <input
              className="w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted/40"
              value={name}
              placeholder={t("home.modals.folder.namePlaceholder")}
              aria-label={t("home.modals.folder.name")}
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
