import type { RefObject } from "react";
import type { LibraryHit } from "@slash-md/ui/home/utils/tree";
import { useTranslation } from "react-i18next";
import { SearchEmpty } from "./SearchEmpty";
import { SearchHitItem } from "./SearchHitItem";

type Props = {
  empty: boolean;
  query: string;
  hits: LibraryHit[];
  listId: string;
  active: number;
  activeRef: RefObject<HTMLButtonElement | null>;
  onActivate: (index: number) => void;
  onChoose: (hit: LibraryHit) => void;
};

export function SearchResults({
  empty,
  query,
  hits,
  listId,
  active,
  activeRef,
  onActivate,
  onChoose,
}: Props) {
  const { t } = useTranslation();

  if (empty) {
    return <SearchEmpty query={query} />;
  }

  if (hits.length === 0) {
    return null;
  }

  return (
    <div className="max-h-[min(20rem,50vh)] overflow-hidden rounded-2xl bg-default/40">
      <ul
        id={listId}
        className="overflow-y-auto p-1"
        role="listbox"
        aria-label={t("search.results")}
      >
        {hits.map((hit, index) => (
          <SearchHitItem
            key={`${hit.kind}:${hit.path}`}
            hit={hit}
            index={index}
            listId={listId}
            selected={index === active}
            query={query}
            activeRef={activeRef}
            onActivate={onActivate}
            onChoose={onChoose}
          />
        ))}
      </ul>
    </div>
  );
}
