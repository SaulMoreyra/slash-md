import { ConflictChoose } from "../../../../../ConflictChoose";
import { ConflictReady } from "../../../../../ConflictChoose/components/ConflictReady";
import { useHome } from "../../../../context";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  hasPage: boolean;
  children: ReactNode;
};

export function Conflict({ hasPage, children }: Props) {
  const { t } = useTranslation();
  const { conflicts, busy } = useHome();

  if (conflicts.editing && hasPage) {
    return children;
  }

  if (conflicts.canFinish && !conflicts.selected) {
    const last = conflicts.decided[conflicts.decided.length - 1];
    return (
      <ConflictReady title={last?.title} markdown={last?.resolvedMarkdown} showBanner />
    );
  }

  if (!conflicts.selected) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted">
        {t("home.conflicts.emptyStage")}
      </div>
    );
  }

  return (
    <ConflictChoose
      file={conflicts.selected}
      decided={Boolean(conflicts.selectedDecided)}
      resolvedMarkdown={conflicts.selectedDecided?.resolvedMarkdown}
      busy={busy}
      onReview={conflicts.onReview}
      onKeepMine={() => void conflicts.onKeepMine()}
      onRequestUseWiki={conflicts.onRequestUseWiki}
      onMarkResolved={(markdown) => void conflicts.onMarkResolved(markdown)}
    />
  );
}
