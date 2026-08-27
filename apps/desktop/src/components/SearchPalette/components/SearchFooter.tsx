import { useTranslation } from "react-i18next";
import { ShortcutKbd } from "../../ShortcutKbd";

export function SearchFooter() {
  const { t } = useTranslation();

  return (
    <p className="text-xs text-muted">
      <ShortcutKbd keys="↑↓" /> <span>{t("search.footMove")}</span>
      {" · "}
      <ShortcutKbd keys="↵" /> <span>{t("search.footOpen")}</span>
      {" · "}
      <ShortcutKbd keys="esc" /> <span>{t("search.footClose")}</span>
    </p>
  );
}
