import type { RefObject } from "react";
import type { LibraryHit } from "@slash-md/ui/home/utils/tree";
import { IconFolder, IconPage } from "../../icons";
import { Highlight } from "./Highlight";

export type SearchHitItemProps = {
  hit: LibraryHit;
  index: number;
  listId: string;
  selected: boolean;
  query: string;
  activeRef: RefObject<HTMLButtonElement | null>;
  onActivate: (index: number) => void;
  onChoose: (hit: LibraryHit) => void;
};

export function SearchHitItem({
  hit,
  index,
  listId,
  selected,
  query,
  activeRef,
  onActivate,
  onChoose,
}: SearchHitItemProps) {
  return (
    <li
      role="presentation"
      className="list-none animate-fade-in motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}
    >
      <button
        ref={selected ? activeRef : undefined}
        type="button"
        id={`${listId}-${index}`}
        role="option"
        aria-selected={selected}
        className={[
          "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left",
          selected ? "bg-default/60" : "hover:bg-default/60",
        ].join(" ")}
        onMouseEnter={() => onActivate(index)}
        onClick={() => onChoose(hit)}
      >
        <span className="mt-0.5 shrink-0 text-muted">
          {hit.kind === "folder" ? <IconFolder size={20} /> : <IconPage size={20} />}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">
            <Highlight text={hit.title} query={query} />
          </span>
          {hit.trail ? <span className="truncate text-xs leading-relaxed text-muted">{hit.trail}</span> : null}
        </span>
      </button>
    </li>
  );
}
