import type { RefObject } from "react";
import type { LibraryHit } from "@slash-md/ui/home/utils/tree";
import { useTranslation } from "react-i18next";
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
    return (
      <p className="m-0 text-sm text-muted" role="status">
        {t("search.empty", { query })}
      </p>
    );
  }

  if (hits.length === 0) {
    return <p className="m-0 text-sm text-muted">{t("search.hint")}</p>;
  }

  return (
    <ul
      id={listId}
      className="-mx-2 min-h-0 flex-1 overflow-y-auto p-0"
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
  );
}
