import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconBranch } from "../../../../components/icons";

type Props = {
  visible: boolean;
  pending: boolean;
  onOpen: () => void;
};

export function PublicationFab({ visible, pending, onOpen }: Props) {
  const { t } = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <Button
      isIconOnly
      className="app-no-drag relative fixed bottom-6 right-6 z-40 size-14 rounded-full bg-orange-500 text-white shadow-lg data-[hovered=true]:bg-orange-400 data-[pressed=true]:bg-orange-600"
      aria-label={t("home.publication.fabAria")}
      onPress={onOpen}
    >
      <IconBranch size={22} />
      {pending ? (
        <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-white" aria-hidden />
      ) : null}
    </Button>
  );
}
