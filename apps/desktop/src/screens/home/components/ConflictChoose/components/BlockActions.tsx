import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

type Props = {
  busy: boolean;
  onKeepMine: () => void;
  onUsePublished: () => void;
  onEdit: () => void;
};

export function BlockActions({ busy, onKeepMine, onUsePublished, onEdit }: Props) {
  const { t } = useTranslation();

  return (
    <div className="absolute right-0 top-0 z-20 flex -translate-y-1/2 translate-x-1 items-center rounded-lg border border-separator bg-surface p-1 shadow-md opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" isDisabled={busy} onPress={onKeepMine}>
        {t("home.conflicts.keepMine")}
      </Button>
      <span className="mx-0.5 h-3 w-px bg-separator" aria-hidden />
      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" isDisabled={busy} onPress={onUsePublished}>
        {t("home.conflicts.usePublished")}
      </Button>
      <span className="mx-0.5 h-3 w-px bg-separator" aria-hidden />
      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" isDisabled={busy} onPress={onEdit}>
        {t("home.conflicts.review")}
      </Button>
    </div>
  );
}
