import { Button, Modal as HeroModal, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { ConflictConfirmKind } from "../../enums";
import { useHome } from "../Home/context";

export function ConflictConfirmModal() {
  const { t } = useTranslation();
  const { conflicts, busy } = useHome();

  if (conflicts.confirm === ConflictConfirmKind.None) {
    return null;
  }

  const useWiki = conflicts.confirm === ConflictConfirmKind.UseWiki;
  const title = useWiki ? t("home.conflicts.useWikiTitle") : t("home.conflicts.cancelTitle");
  const body = useWiki
    ? t("home.conflicts.useWikiBody", { title: conflicts.selected?.title ?? "" })
    : t("home.conflicts.cancelBody");
  const confirmLabel = useWiki ? t("home.conflicts.useWiki") : t("home.conflicts.cancel");
  const onConfirm = useWiki ? conflicts.onConfirmUseWiki : conflicts.onConfirmAbort;

  return (
    <HeroModal.Backdrop
      isOpen
      isDismissable={!busy}
      onOpenChange={(open) => {
        if (!open && !busy) {
          conflicts.onCancelConfirm();
        }
      }}
    >
      <HeroModal.Container size="lg">
        <HeroModal.Dialog className="bg-surface" aria-busy={busy}>
          {busy ? null : <HeroModal.CloseTrigger />}
          <HeroModal.Header>
            <HeroModal.Heading>{title}</HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex flex-col gap-6 px-8 pb-8">
            <p className="text-sm text-muted">{body}</p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" isDisabled={busy} onPress={conflicts.onCancelConfirm}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                className={useWiki ? "bg-danger text-white" : undefined}
                isDisabled={busy}
                onPress={() => void onConfirm()}
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
