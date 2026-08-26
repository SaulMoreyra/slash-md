import { Description, Label } from "@heroui/react";
import type { ConflictFile } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { IconCheckCircle } from "../../../../../components/icons";
import { ConflictRowStatus } from "../../../enums";
import { CONFLICT_ROW_STATUS_LABEL, conflictRowStatus } from "../utils";

type Props = {
  file: ConflictFile;
  decided: boolean;
  selected: boolean;
  onSelect: (path: string) => void;
};

export function ConflictRow({ file, decided, selected, onSelect }: Props) {
  const { t } = useTranslation();
  const status = conflictRowStatus(file, decided);
  const needsChoice = status !== ConflictRowStatus.Decided;

  return (
    <button
      type="button"
      onClick={() => onSelect(file.path)}
      className={[
        "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors",
        selected
          ? "border-separator bg-default/60"
          : "border-transparent hover:border-separator hover:bg-default/40",
      ].join(" ")}
    >
      {selected ? (
        <span
          className={`absolute bottom-0 left-0 top-0 w-0.5 ${needsChoice ? "bg-warning" : "bg-accent"}`}
          aria-hidden
        />
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <Label className="min-w-0 flex-1 truncate text-sm font-medium">{file.title}</Label>
        {needsChoice ? (
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-warning" aria-hidden />
        ) : (
          <IconCheckCircle size={16} className="mt-0.5 shrink-0 text-success" />
        )}
      </div>
      <Description className="mt-0.5 text-[11px] text-muted">
        {t(CONFLICT_ROW_STATUS_LABEL[status])}
      </Description>
    </button>
  );
}
