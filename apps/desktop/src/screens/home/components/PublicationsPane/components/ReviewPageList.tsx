import type { LocalDraft } from "@slash-md/core/homeTypes";
import { ReviewPageRow } from "./ReviewPageRow";

type Props = {
  drafts: LocalDraft[];
  listLabel: string;
  pagePath: string | null;
  trailFor: (path: string) => string;
  onOpenPage: (path: string) => void;
};

export function ReviewPageList({ drafts, listLabel, pagePath, trailFor, onOpenPage }: Props) {
  return (
    <div className="flex flex-col gap-0.5 px-2 pb-2" role="list" aria-label={listLabel}>
      {drafts.map((draft) => (
        <div key={draft.path} role="listitem">
          <ReviewPageRow
            draft={draft}
            trail={trailFor(draft.path)}
            open={pagePath === draft.path}
            onOpen={() => onOpenPage(draft.path)}
          />
        </div>
      ))}
    </div>
  );
}
