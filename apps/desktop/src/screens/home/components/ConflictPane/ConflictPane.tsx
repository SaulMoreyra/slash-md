import { Button, Card, Description, ScrollShadow } from "@heroui/react";
import type { ConflictFile } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import type { DecidedConflict } from "../../hooks/useConflicts";
import { PaneHeader } from "../PaneHeader";
import { ConflictList } from "./components/ConflictList";

type Props = {
  files: ConflictFile[];
  decided: DecidedConflict[];
  selectedPath: string | null;
  canFinish: boolean;
  remainingCount: number;
  totalCount: number;
  busy: boolean;
  onSelect: (path: string) => void;
  onRequestAbort: () => void;
  onFinish: () => void;
};

export function ConflictPane({
  files,
  decided,
  selectedPath,
  canFinish,
  remainingCount,
  totalCount,
  busy,
  onSelect,
  onRequestAbort,
  onFinish,
}: Props) {
  const { t } = useTranslation();
  const title = t("home.conflicts.title");
  const empty = files.length === 0 && decided.length === 0;
  const progress =
    totalCount > 0
      ? canFinish
        ? t("home.conflicts.progressDone", { done: totalCount, total: totalCount })
        : t("home.conflicts.progressChoice", {
            count: remainingCount,
            remaining: remainingCount,
            total: totalCount,
          })
      : null;

  return (
    <>
      <PaneHeader title={title} />
      <ScrollShadow className="min-h-0 flex-1 [--scroll-shadow-scrollbar-size:0px]">
        {empty ? (
          <Description className="px-4 py-4 text-muted">{t("home.conflicts.ready")}</Description>
        ) : (
          <ConflictList
            files={files}
            decided={decided}
            selectedPath={selectedPath}
            listLabel={title}
            onSelect={onSelect}
          />
        )}
      </ScrollShadow>
      <Card.Footer className="flex flex-col gap-2 px-4 pb-4">
        {progress ? <p className="text-center text-[11px] leading-snug text-muted">{progress}</p> : null}
        <Button variant="primary" fullWidth isDisabled={busy || !canFinish} onPress={onFinish}>
          {t("home.conflicts.finish")}
        </Button>
        <Button variant="ghost" fullWidth isDisabled={busy} onPress={onRequestAbort}>
          {t("home.conflicts.cancel")}
        </Button>
      </Card.Footer>
    </>
  );
}
