import { useEffect, useMemo, useState } from "react";
import { rankLibraryHits } from "@slash-md/ui/home/utils/tree";
import type { SearchEntry } from "../../../../shared/api";
import { shortcutLabel } from "../../../components/ShortcutKbd";
import { libraryHitsFromIndex } from "../utils";

const api = () => window.slashmd;

type Params = {
  contentPath: string;
  /** Skip indexing until there is a workspace to index. */
  enabled: boolean;
};

export type SearchApi = ReturnType<typeof useSearch>;

/**
 * Search over every page, not just the folders the rail has open.
 *
 * The library tree is indexed lazily, so it can no longer back the palette. The
 * host keeps a flat path + title index instead, built off the render path and
 * cached until something writes; this pulls it in the first time the palette is
 * opened rather than on load, so a workspace nobody searches never pays for it.
 */
export function useSearch({ contentPath, enabled }: Params) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);

  /**
   * Warms as soon as there is a workspace, then again whenever the palette is
   * opened.
   *
   * The warm pass is what keeps the first search instant — building the index
   * over a large workspace takes about a second, and paying that on the first
   * keystroke is felt. It is fire-and-forget, off the render path. Reopening
   * refetches so a page added since is found; the host drops its cache on every
   * write, so that is a cache hit unless something actually changed.
   *
   * Both deps are booleans on purpose. Keying this on the snapshot object turned
   * a caller that rebuilt it during render into a refetch loop.
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    void api()
      .searchIndex()
      .then((next) => {
        if (!cancelled) {
          setEntries(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, open]);

  const hits = useMemo(
    () => rankLibraryHits(libraryHitsFromIndex(entries, contentPath), query),
    [entries, contentPath, query],
  );
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
