import { Folder } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  parent?: string;
};

export function FolderDestination({ parent }: Props) {
  const { t } = useTranslation();
  const title = parent || t("home.modals.folder.rootLabel");

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-default/40 px-3 py-3">
      <span className="mt-0.5 text-muted" aria-hidden>
        <Folder size={20} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          {t("home.modals.folder.destination")}
        </p>
      </div>
    </div>
  );
}
