import { useState } from "react";
import { Button, Modal as HeroModal, Spinner } from "@heroui/react";
import { GitBranch } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  busy?: boolean;
  onClose: () => void;
  onCreate: (title: string) => void;
};

export function NewPublicationModal({ busy = false, onClose, onCreate }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const trimmed = title.trim();
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
            <HeroModal.Heading>{t("home.publication.modalTitle")}</HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex flex-col gap-6 px-8 py-10">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-muted">
                <GitBranch size={28} strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <input
                  className="w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted/40"
                  value={title}
                  placeholder={t("home.publication.modalTitlePlaceholder")}
                  aria-label={t("home.publication.modalTitleLabel")}
                  autoFocus
                  disabled={busy}
                  onChange={(ev) => setTitle(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      submit();
                    }
                  }}
                />
                <p className="mt-2 text-sm text-muted">{t("home.publication.modalHint")}</p>
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
