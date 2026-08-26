import { useEffect, useId, useRef, useState } from "react";
import type { LibraryHit } from "@slash-md/ui/home/utils/tree";

type Params = {
  query: string;
  hits: LibraryHit[];
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onOpenFolder: (path: string, title: string) => void;
};

export function useSearchPaletteController({
  query,
  hits,
  onClose,
  onOpenFile,
  onOpenFolder,
}: Params) {
  const reactId = useId();
  const listId = `finder-${reactId.replace(/:/g, "")}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(0);
  const q = query.trim();
  const empty = q.length > 0 && hits.length === 0;
  const activeHit = hits[active];

  function choose(hit: LibraryHit) {
    if (hit.kind === "folder") {
      onOpenFolder(hit.path, hit.title);
    } else {
      onOpenFile(hit.path);
    }
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active, hits]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        onClose();
        return;
      }
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setActive((i) => (hits.length === 0 ? 0 : (i + 1) % hits.length));
        return;
      }
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setActive((i) => (hits.length === 0 ? 0 : (i - 1 + hits.length) % hits.length));
        return;
      }
      if (ev.key === "Enter" && activeHit) {
        ev.preventDefault();
        choose(activeHit);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [activeHit, hits.length, onClose]);

  return {
    listId,
    inputRef,
    activeRef,
    active,
    q,
    empty,
    activeHit,
    onActivate: setActive,
    onChoose: choose,
  };
}
