import { useTranslation } from "react-i18next";
import type { ReviewThread } from "../../../../../shared/api";

type Props = {
  orphans: ReviewThread[];
  onOpenThread: (thread: ReviewThread) => void;
};

export function OrphanThreadRail({ orphans, onOpenThread }: Props) {
  const { t } = useTranslation();
  return (
    <aside className="thread-rail" aria-label={t("editor.offCanvasAria")}>
      <div className="thread-rail-head">
        <div className="thread-rail-title">{t("editor.offCanvas")}</div>
        <div className="thread-rail-count">{orphans.length}</div>
      </div>
      {orphans.map((thread) => (
        <button key={thread.id} type="button" className="thread-rail-item" onClick={() => onOpenThread(thread)}>
          {thread.comments[0]?.author ?? t("editor.reviewFallback")}
        </button>
      ))}
    </aside>
  );
}
