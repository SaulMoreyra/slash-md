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
    <div className="pointer-events-none fixed bottom-10 right-5 z-40">
      <Button
        isIconOnly
        className="pointer-events-auto relative size-14 rounded-full opacity-80 border border-orange-500 bg-orange-500/25 text-orange-500 shadow-lg data-[hovered=true]:bg-orange-400/40 data-[pressed=true]:bg-orange-600/40"
        aria-label={t("home.publication.fabAria")}
        onPress={onOpen}
      >
        <IconBranch size={36} className="text-orange-500/80" />
        {pending ? (
          <span
            className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-white"
            aria-hidden
          />
        ) : null}
      </Button>
    </div>
  );
}
