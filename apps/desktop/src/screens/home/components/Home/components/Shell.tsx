import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="app-drag relative flex h-dvh gap-3 bg-background pt-10 text-foreground">
      <a
        className="app-no-drag sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        href="#home-stage"
      >
        {t("home.skipToContent")}
      </a>
      <div className="app-no-drag flex min-h-0 min-w-0 flex-1 gap-3">
        {children}
      </div>
    </div>
  );
}
