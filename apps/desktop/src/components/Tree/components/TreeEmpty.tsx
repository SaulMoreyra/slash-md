import { useTranslation } from "react-i18next";
import { IconFolder } from "../../icons";

export function TreeEmpty() {
  const { t } = useTranslation();

  return (
    <div className="px-1 py-4">
      <span className="text-muted" aria-hidden>
        <IconFolder size={20} />
      </span>
      <p className="mt-2 text-sm font-medium text-foreground">{t("home.tree.emptyTitle")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t("home.tree.emptyBody")}</p>
    </div>
  );
}
