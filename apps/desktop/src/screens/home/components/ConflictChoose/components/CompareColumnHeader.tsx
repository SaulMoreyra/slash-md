import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { ConflictSide } from "../../../enums";

type Props = {
  side: ConflictSide;
  busy: boolean;
  onAccept: () => void;
};

export function CompareColumnHeader({ side, busy, onAccept }: Props) {
  const { t } = useTranslation();
  const isYours = side === ConflictSide.Current;

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-separator bg-default/40 px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[11px] font-semibold tracking-wider">
          {t(isYours ? "home.conflicts.yoursCard" : "home.conflicts.wikiCard")}
        </span>
        <span className="truncate text-[11px] text-muted">
          ({t(isYours ? "home.conflicts.currentMeta" : "home.conflicts.incomingMeta")})
        </span>
      </div>
      <Button size="sm" variant="ghost" isDisabled={busy} onPress={onAccept}>
        {t(isYours ? "home.conflicts.keepMine" : "home.conflicts.useWiki")}
      </Button>
    </div>
  );
}
