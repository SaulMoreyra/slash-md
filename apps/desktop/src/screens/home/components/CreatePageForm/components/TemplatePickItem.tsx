import { createElement } from "react";
import { Chip } from "@heroui/react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { TemplatePick } from "../../../../../../shared/api";
import { templateIcon } from "../../../utils/templateIcon";

type Props = {
  pick: TemplatePick;
  selected: boolean;
  busy: boolean;
  index: number;
  onSelect: (id: string) => void;
};

export function TemplatePickItem({ pick, selected, busy, index, onSelect }: Props) {
  const { t } = useTranslation();
  const copy = pickCopy(pick, t);

  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={selected}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={[
        "flex flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left",
        "animate-rise motion-reduce:animate-none",
        "transition-[transform,background-color,border-color] duration-200 ease-out",
        "motion-reduce:transition-none motion-reduce:scale-100",
        selected
          ? "scale-[1.02] border-accent bg-accent/10 text-foreground shadow-sm"
          : "border-transparent bg-default/40 text-foreground hover:bg-default/70",
      ].join(" ")}
      onClick={() => onSelect(pick.id)}
    >
      <span className={selected ? "text-accent" : "text-muted"}>
        {createElement(templateIcon(pick), { size: 22 })}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{copy.label}</span>
        {pick.source === "workspace" ? (
          <Chip size="sm" variant="soft" color="accent">
            <Chip.Label>{t("home.modals.templates.workspaceBadge")}</Chip.Label>
          </Chip>
        ) : null}
      </span>
      {copy.description ? (
        <span className="line-clamp-2 text-xs text-muted" aria-hidden>
          {copy.description}
        </span>
      ) : null}
    </button>
  );
}

function pickCopy(pick: TemplatePick, t: TFunction) {
  if (pick.source === "workspace") {
    return { label: pick.label, description: pick.description };
  }
  return {
    label: t(`home.modals.templates.${pick.id}.label`, { defaultValue: pick.label }),
    description: t(`home.modals.templates.${pick.id}.description`, { defaultValue: pick.description }),
  };
}
