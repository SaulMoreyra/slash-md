import { Modal as HeroModal } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { CreateIntent } from "../../enums";
import { CreatePageForm, type CreatePageInput } from "../CreatePageForm";

type Props = {
  section?: string;
  createIntent?: CreateIntent;
  busy?: boolean;
  onClose: () => void;
  onCreate: (input: CreatePageInput) => void;
};

export function NewPageModal({
  section,
  createIntent = CreateIntent.Page,
  busy = false,
  onClose,
  onCreate,
}: Props) {
  const { t } = useTranslation();
  const heading =
    createIntent === CreateIntent.Template ? t("home.modals.template.title") : t("home.modals.page.title");
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
        <HeroModal.Dialog className="bg-surface">
          {busy ? null : <HeroModal.CloseTrigger />}
          <HeroModal.Header className="sr-only">
            <HeroModal.Heading>{heading}</HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="px-8 py-10">
            <CreatePageForm
              compact
              section={section}
              createIntent={createIntent}
              busy={busy}
              onCancel={onClose}
              onCreate={onCreate}
            />
          </HeroModal.Body>
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  );
}
