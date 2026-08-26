import { I18nProvider } from "@heroui/react";
import type { ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { toHeroLocale } from "./index";

function HeroLocaleBridge({ children }: { children: ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  return <I18nProvider locale={toHeroLocale(i18nInstance.language)}>{children}</I18nProvider>;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <HeroLocaleBridge>{children}</HeroLocaleBridge>
    </I18nextProvider>
  );
}
