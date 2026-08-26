import type { ConflictFile } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { ConflictCompareMode } from "../../enums";
import { ConflictChooseActions } from "./components/ConflictChooseActions";
import { CompareToolbar } from "./components/CompareToolbar";
import { ConflictReady } from "./components/ConflictReady";
import { OnePageCompare } from "./components/OnePageCompare";
import { SideBySideCompare } from "./components/SideBySideCompare";
import { useConflictChooseController } from "./hooks/useConflictChooseController";

type Props = {
  file: ConflictFile;
  decided?: boolean;
  resolvedMarkdown?: string;
  busy: boolean;
  onReview: () => void;
  onKeepMine: () => void;
  onRequestUseWiki: () => void;
  onMarkResolved: (markdown: string) => void;
};

export function ConflictChoose({
  file,
  decided = false,
  resolvedMarkdown,
  busy,
  onReview,
  onKeepMine,
  onRequestUseWiki,
  onMarkResolved,
}: Props) {
  const { t } = useTranslation();
  const controller = useConflictChooseController({
    file,
    busy,
    onKeepMine,
    onRequestUseWiki,
    onReview,
    onMarkResolved,
  });

  if (decided) {
    return (
      <ConflictReady title={file.title} markdown={resolvedMarkdown || file.oursMarkdown || undefined} />
    );
  }

  if (!controller.isEdit) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6 animate-fade-in motion-reduce:animate-none">
        <header className="shrink-0">
          <h1 className="text-base font-semibold">{file.title}</h1>
          <p className="mt-0.5 text-[11px] text-muted">{t("home.conflicts.binaryHint")}</p>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <ConflictChooseActions
            kind={file.kind}
            busy={busy}
            onReview={onReview}
            onKeepMine={onKeepMine}
            onRequestUseWiki={onRequestUseWiki}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 animate-fade-in motion-reduce:animate-none">
      <header className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{file.title}</h1>
          <p className="mt-0.5 text-[11px] text-muted">{t("home.conflicts.bothChanged")}</p>
        </div>
        <CompareToolbar mode={controller.mode} onModeChange={controller.onModeChange} />
      </header>
      {controller.mode === ConflictCompareMode.SideBySide ? (
        <SideBySideCompare
          slots={controller.slots}
          choices={controller.choices}
          busy={busy}
          onKeepMine={onKeepMine}
          onRequestUseWiki={onRequestUseWiki}
          onChooseBlock={controller.onChooseBlock}
          onReview={onReview}
        />
      ) : (
        <OnePageCompare
          slots={controller.slots}
          choices={controller.choices}
          busy={busy}
          onChooseBlock={controller.onChooseBlock}
          onReview={onReview}
        />
      )}
    </div>
  );
}
