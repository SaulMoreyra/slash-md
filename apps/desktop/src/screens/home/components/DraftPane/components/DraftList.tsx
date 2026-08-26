import type { LocalDraft } from "@slash-md/core/homeTypes";
import { DraftCard } from "../../DraftCard";

type Props = {
  drafts: LocalDraft[];
  title: string;
  pagePath: string | null;
  personal: boolean;
  busy: boolean;
  selected: Set<string>;
  trailFor: (path: string) => string;
  onOpenPage: (path: string) => void;
  onToggle: (path: string) => void | Promise<void>;
  onDiscard: (path: string, title: string) => void | Promise<void>;
};

export function DraftList({
  drafts,
  title,
  pagePath,
  personal,
  busy,
  selected,
  trailFor,
  onOpenPage,
  onToggle,
  onDiscard,
}: Props) {
  return (
    <div className="flex flex-col gap-0.5 px-2 pb-2" role="list" aria-label={title}>
      {drafts.map((draft) => (
        <div key={draft.path} role="listitem">
          <DraftCard
            draft={draft}
            trail={trailFor(draft.path)}
            checked={selected.has(draft.path)}
            open={pagePath === draft.path}
            selectable={!personal}
            busy={busy}
            onOpen={() => onOpenPage(draft.path)}
            onToggle={() => onToggle(draft.path)}
            onDiscard={() => onDiscard(draft.path, draft.title)}
          />
        </div>
      ))}
    </div>
  );
}
