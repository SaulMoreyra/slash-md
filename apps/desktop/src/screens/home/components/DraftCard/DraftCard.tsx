import { Button, Chip } from "@heroui/react";
import type { LocalDraft } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { IconCheck, IconDiscard } from "../../../../components/icons";
import { fileLabel, formatTrail } from "../../utils";
import { useDraftCardController } from "./hooks/useDraftCardController";

type Props = {
  draft: LocalDraft;
  trail: string;
  checked: boolean;
  open: boolean;
  selectable: boolean;
  busy: boolean;
  onOpen: () => void;
  onToggle: () => void | Promise<void>;
  onDiscard?: () => void;
};

export function DraftCard({
  draft,
  trail,
  checked,
  open,
  selectable,
  busy,
  onOpen,
  onToggle,
  onDiscard,
}: Props) {
  const { t } = useTranslation();
  const { isChecked, chip, onOptimisticToggle } = useDraftCardController({ draft, checked });

  return (
    <div
      className={[
        "flex items-center gap-1 rounded-2xl px-2 py-1.5",
        open ? "bg-default/60" : "hover:bg-default/40",
      ].join(" ")}
    >
      {selectable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={isChecked}
          aria-label={t("home.drafts.includeAria", { title: draft.title })}
          disabled={busy}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
          onClick={() => onOptimisticToggle(onToggle)}
        >
          <span
            className={[
              "flex size-5 items-center justify-center rounded-md border-2 transition-[colors,transform] duration-150 ease-out motion-reduce:scale-100 motion-reduce:transition-none",
              isChecked
                ? "scale-100 border-accent bg-accent text-accent-foreground"
                : "scale-95 border-muted-foreground/50 bg-transparent text-transparent",
            ].join(" ")}
            aria-hidden
          >
            {isChecked ? <IconCheck size={14} strokeWidth={2.5} /> : null}
          </span>
        </button>
      ) : null}
      <button
        type="button"
        className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-1 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        onClick={onOpen}
      >
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {fileLabel(draft.title, draft.path)}
          </span>
          <Chip size="sm" variant="soft">
            <Chip.Label>{chip.letter}</Chip.Label>
          </Chip>
        </span>
        {trail ? <span className="truncate text-xs text-muted">{formatTrail(trail)}</span> : null}
      </button>
      {onDiscard ? (
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="shrink-0 text-muted hover:text-danger"
          aria-label={t("home.drafts.discardAria", { title: draft.title })}
          isDisabled={busy}
          onPress={onDiscard}
        >
          <IconDiscard />
        </Button>
      ) : null}
    </div>
  );
}
