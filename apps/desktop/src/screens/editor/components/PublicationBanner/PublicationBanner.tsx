import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { PublicationState } from "../../../../../shared/api";

type Props = {
  publication: PublicationState;
  canWrite: boolean;
  onCreatePublication?: () => void;
};

export function PublicationBanner({ publication, canWrite, onCreatePublication }: Props) {
  const { t } = useTranslation();

  if (!canWrite) {
    return (
      <div
        className="flex shrink-0 items-center gap-2 border-b border-separator px-4 py-1.5 animate-fade-in motion-reduce:animate-none"
        role="status"
      >
        <p className="min-w-0 flex-1 truncate text-xs text-muted">{t("editor.readOnlyBanner")}</p>
        {onCreatePublication ? (
          <Button size="sm" variant="primary" className="shrink-0" onPress={onCreatePublication}>
            {t("editor.createPublication")}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-separator px-4 py-1.5 animate-fade-in motion-reduce:animate-none"
      role="status"
    >
      <p className="min-w-0 flex-1 truncate text-xs text-muted">
        {t("editor.publicationBanner", { title: publication.title })}
      </p>
    </div>
  );
}
