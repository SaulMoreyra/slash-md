import type { LocalDraft } from "@slash-md/core/homeTypes";
import { formatTrail } from "../../../utils";

type Props = {
  draft: LocalDraft;
  trail: string;
  open: boolean;
  onOpen: () => void;
};

export function ReviewPageRow({ draft, trail, open, onOpen }: Props) {
  return (
    <button
      type="button"
      className={[
        "flex w-full min-w-0 flex-col gap-0.5 rounded-xl px-3 py-2 text-left outline-none transition-colors duration-150 ease-out",
        "focus-visible:ring-2 focus-visible:ring-accent/40 motion-reduce:transition-none",
        open ? "bg-default/60" : "hover:bg-default/40",
      ].join(" ")}
      onClick={onOpen}
    >
      <span className="truncate text-sm font-medium text-foreground" title={draft.title}>
        {draft.title}
      </span>
      {trail ? (
        <span className="truncate text-[11px] text-muted" title={trail}>
          {formatTrail(trail)}
        </span>
      ) : null}
    </button>
  );
}
