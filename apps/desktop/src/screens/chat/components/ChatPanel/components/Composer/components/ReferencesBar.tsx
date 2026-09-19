import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";

type Props = {
  paths: string[];
  onRemove: (path: string) => void;
};

export function ReferencesBar({ paths, onRemove }: Props) {
  const { t } = useTranslation();

  if (paths.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1">
      {paths.map((path) => (
        <Chip key={path} size="sm" variant="soft" className="gap-1">
          <Chip.Label>@{path}</Chip.Label>
          <button
            type="button"
            aria-label={t("home.chat.mention.remove", { path })}
            onClick={() => onRemove(path)}
            className="text-muted hover:text-danger"
          >
            ×
          </button>
        </Chip>
      ))}
    </div>
  );
}