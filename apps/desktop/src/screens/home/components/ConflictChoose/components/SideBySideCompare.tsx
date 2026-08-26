import type { AlignedSlot, BlockSide } from "@slash-md/core/conflictBlocks";
import { ConflictSide } from "../../../enums";
import { ArticleBlock } from "./ArticleBlock";
import { CompareColumnHeader } from "./CompareColumnHeader";

type Props = {
  slots: AlignedSlot[];
  choices: ReadonlyMap<number, BlockSide>;
  busy: boolean;
  onKeepMine: () => void;
  onRequestUseWiki: () => void;
  onChooseBlock: (index: number, side: BlockSide) => void;
  onReview: () => void;
};

export function SideBySideCompare({
  slots,
  choices,
  busy,
  onKeepMine,
  onRequestUseWiki,
  onChooseBlock,
  onReview,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-separator bg-background">
      <div className="flex shrink-0">
        <div className="min-w-0 flex-1 border-r border-separator">
          <CompareColumnHeader side={ConflictSide.Current} busy={busy} onAccept={onKeepMine} />
        </div>
        <div className="min-w-0 flex-1">
          <CompareColumnHeader side={ConflictSide.Incoming} busy={busy} onAccept={onRequestUseWiki} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto border-r border-separator p-6">
          <div className="mx-auto max-w-[500px]">
            {slots.map((slot, index) => (
              <ArticleBlock
                key={`ours-${index}`}
                slot={slot}
                index={index}
                side="ours"
                choice={choices.get(index)}
                busy={busy}
              />
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[500px]">
            {slots.map((slot, index) => (
              <ArticleBlock
                key={`theirs-${index}`}
                slot={slot}
                index={index}
                side="theirs"
                choice={choices.get(index)}
                busy={busy}
                showActions={slot.type === "change"}
                onChoose={onChooseBlock}
                onEdit={onReview}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
