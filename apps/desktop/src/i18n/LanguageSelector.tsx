import { ListBox, Select } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { changeLanguage, LOCALES, normalizeLocale, type AppLocale } from "./index";

type Props = {
  className?: string;
};

export function LanguageSelector({ className }: Props) {
  const { i18n, t } = useTranslation();
  const current = normalizeLocale(i18n.language);

  return (
    <Select
      aria-label={t("common.language")}
      className={className}
      selectedKey={current}
      onSelectionChange={(key) => {
        if (key == null) {
          return;
        }
        const next = String(key);
        if (next === current || !LOCALES.some((locale) => locale.id === next)) {
          return;
        }
        void changeLanguage(next as AppLocale);
      }}
      variant="secondary"
    >
      <Select.Trigger className="min-w-34">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {LOCALES.map((locale) => (
            <ListBox.Item key={locale.id} id={locale.id} textValue={locale.label}>
              {locale.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
