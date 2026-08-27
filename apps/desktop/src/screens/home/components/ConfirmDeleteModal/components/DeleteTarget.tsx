import { FileText, Folder } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TreeEntryKind } from "../../../enums";

type Props = {
  title: string;
  kind: TreeEntryKind;
};

export function DeleteTarget({ title, kind }: Props) {
  const { t } = useTranslation();
  const isFolder = kind === TreeEntryKind.Folder;
  const Icon = isFolder ? Folder : FileText;
  const kindLabel = isFolder
    ? t("home.modals.delete.targetFolder")
    : t("home.modals.delete.targetFile");

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-default/40 px-3 py-3">
      <span className="mt-0.5 text-muted" aria-hidden>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{kindLabel}</p>
      </div>
    </div>
  );
}
