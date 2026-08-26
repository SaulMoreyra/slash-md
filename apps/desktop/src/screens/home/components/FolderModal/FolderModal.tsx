import { useState } from "react";
import { Button, Modal as HeroModal, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconFolder } from "../../../../components/icons";

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
          <HeroModal.Body className="flex flex-col gap-6 px-8 py-10">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-muted">
                <IconFolder size={28} />
              </span>
              <div className="min-w-0 flex-1">
                <input
                  className="w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted/40"
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
                {parent ? (
                  <p className="mt-2 text-sm text-muted">{t("home.modals.folder.inside", { parent })}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted">{t("home.modals.folder.hint")}</p>
                )}
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
