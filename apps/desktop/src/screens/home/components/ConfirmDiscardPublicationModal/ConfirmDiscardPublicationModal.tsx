import { Button, Modal as HeroModal, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { PublicationKind } from "../../enums";
import type { DiscardPublicationTarget } from "../../types";
import { DiscardDetails } from "./components/DiscardDetails";

type Props = {
  target: DiscardPublicationTarget;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDiscardPublicationModal({ target, busy = false, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const heading = t("home.publication.discardTitle", { title: target.title });
  const confirmLabel = busy ? t("home.publication.discarding") : t("home.publication.discard");

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
              <p className="truncate text-3xl font-semibold tracking-tight text-foreground" title={target.title}>
                {heading}
              </p>
              <DiscardDetails
                lede={t("home.publication.discardLede")}
                dirty={
                  target.mounted && target.dirtyCount > 0
                    ? t("home.publication.discardDirty", { count: target.dirtyCount })
                    : null
                }
                review={reviewCopy(t, target)}
              />
            </div>
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

function reviewCopy(
  t: (key: string) => string,
  target: DiscardPublicationTarget,
): string | null {
  if (!target.mounted) {
    return t("home.publication.discardOtherReview");
  }
  if (target.kind === PublicationKind.InReview) {
    return t("home.publication.discardCancelsReview");
  }
  return null;
}
