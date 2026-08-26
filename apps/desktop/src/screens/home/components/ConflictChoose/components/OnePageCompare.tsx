import type { AlignedSlot, BlockSide } from "@slash-md/core/conflictBlocks";
import { ArticleBlock } from "./ArticleBlock";

type Props = {
  slots: AlignedSlot[];
  choices: ReadonlyMap<number, BlockSide>;
  busy: boolean;
  onChooseBlock: (index: number, side: BlockSide) => void;
  onReview: () => void;
};

export function OnePageCompare({ slots, choices, busy, onChooseBlock, onReview }: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-separator bg-background p-8">
      <div className="mx-auto max-w-3xl">
        {slots.map((slot, index) => (
          <ArticleBlock
            key={`one-${index}`}
            slot={slot}
            index={index}
            side="merged"
            choice={choices.get(index)}
            busy={busy}
            onChoose={onChooseBlock}
            onEdit={onReview}
          />
        ))}
      </div>
    </div>
  );
}
