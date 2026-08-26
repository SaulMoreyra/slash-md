import { useMemo, useState } from "react";
import { flattenLibrary, rankLibraryHits } from "@slash-md/ui/home/utils/tree";
import type { HomeTreeNode } from "../../../../shared/api";
import { shortcutLabel } from "../../../components/ShortcutKbd";

type Params = {
  roots: HomeTreeNode[];
};

export type SearchApi = ReturnType<typeof useSearch>;

export function useSearch({ roots }: Params) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const hits = useMemo(() => rankLibraryHits(flattenLibrary(roots), query), [roots, query]);
  const keys = shortcutLabel.search();

  function onOpen() {
    setOpen(true);
  }

  /** Open with an empty query (rail / explicit search entry). */
  function onOpenCleared() {
    setQuery("");
    setOpen(true);
  }

  function onClose() {
    setOpen(false);
    setQuery("");
  }

  function onToggle() {
    if (open) {
      onClose();
    } else {
      setOpen(true);
    }
  }

  function onQueryChange(next: string) {
    setQuery(next);
  }

  return {
    open,
    query,
    hits,
    keys,
    onOpen,
    onOpenCleared,
    onClose,
    onToggle,
    onQueryChange,
  };
}
