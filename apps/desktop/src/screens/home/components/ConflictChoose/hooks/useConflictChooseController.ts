import { useEffect, useMemo, useState } from "react";
import type { ConflictFile } from "@slash-md/core/homeTypes";
import {
  alignMarkdownBlocks,
  allDiffsChosen,
  applyBlockChoice,
  reconstructMarkdown,
  type BlockSide,
} from "@slash-md/core/conflictBlocks";
import { ConflictCompareMode } from "../../../enums";

type Params = {
  file: ConflictFile;
  busy: boolean;
  onKeepMine: () => void;
  onRequestUseWiki: () => void;
  onReview: () => void;
  onMarkResolved: (markdown: string) => void;
};

export function useConflictChooseController({
  file,
  busy,
  onKeepMine,
  onRequestUseWiki,
  onReview,
  onMarkResolved,
}: Params) {
  const [mode, setMode] = useState(ConflictCompareMode.SideBySide);
  const [choices, setChoices] = useState<Map<number, BlockSide>>(() => new Map());

  const slots = useMemo(
    () => alignMarkdownBlocks(file.oursMarkdown, file.theirsMarkdown),
    [file.oursMarkdown, file.theirsMarkdown, file.path],
  );

  useEffect(() => {
    setChoices(new Map());
    setMode(ConflictCompareMode.SideBySide);
  }, [file.path]);

  const mixReady = allDiffsChosen(slots, choices);
  const draftMarkdown = reconstructMarkdown(slots, choices);
  const isEdit = file.kind === "edit";

  function onChooseBlock(index: number, side: BlockSide) {
    const next = applyBlockChoice(choices, index, side);
    setChoices(next);
    if (allDiffsChosen(slots, next)) {
      onMarkResolved(reconstructMarkdown(slots, next));
    }
  }

  function onApplyMix() {
    if (!mixReady || busy) {
      return;
    }
    onMarkResolved(draftMarkdown);
  }

  return {
    mode,
    onModeChange: setMode,
    slots,
    choices,
    mixReady,
    draftMarkdown,
    isEdit,
    busy,
    onKeepMine,
    onRequestUseWiki,
    onReview,
    onChooseBlock,
    onApplyMix,
  };
}

export type ConflictChooseController = ReturnType<typeof useConflictChooseController>;
