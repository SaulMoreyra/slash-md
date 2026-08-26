import { useTranslation } from "react-i18next";
import { IconCheckCircle } from "../../../../../components/icons";

type Props = {
  title?: string;
  markdown?: string;
  showBanner?: boolean;
};

export function ConflictReady({ title, markdown, showBanner = true }: Props) {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden animate-fade-in motion-reduce:animate-none">
      {showBanner ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 backdrop-blur-sm">
            <IconCheckCircle size={18} className="text-success" />
            <span className="text-[11px] font-medium text-success">{t("home.conflicts.readyBanner")}</span>
          </div>
        </div>
      ) : null}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-separator bg-default/40 px-4">
        <p className="truncate text-xs text-muted">{title ?? t("home.conflicts.ready")}</p>
        <span className="text-[11px] text-muted">{t("home.conflicts.finalVersion")}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-background p-8">
        {markdown ? (
          <pre className="mx-auto max-w-3xl whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {markdown}
          </pre>
        ) : (
          <p className="text-center text-sm text-muted">{t("home.conflicts.ready")}</p>
        )}
      </div>
    </div>
  );
}
