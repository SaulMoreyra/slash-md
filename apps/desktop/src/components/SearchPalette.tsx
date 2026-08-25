import { useEffect, useId, useRef, useState } from "react";
import type { LibraryHit } from "@slash-md/ui/home/utils/tree";
import { IconFolder, IconPage, IconSearch } from "./icons";

type Props = {
  query: string;
  hits: LibraryHit[];
  onQuery: (value: string) => void;
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onOpenFolder: (path: string, title: string) => void;
};

export function SearchPalette({ query, hits, onQuery, onClose, onOpenFile, onOpenFolder }: Props) {
  const reactId = useId();
  const listId = `finder-${reactId.replace(/:/g, "")}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(0);
  const q = query.trim();
  const empty = q.length > 0 && hits.length === 0;
  const activeHit = hits[active];

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

  function choose(hit: LibraryHit) {
    if (hit.kind === "folder") {
      onOpenFolder(hit.path, hit.title);
    } else {
      onOpenFile(hit.path);
    }
  }

  return (
    <div className="finder-backdrop" onClick={onClose} role="presentation">
      <div
        className="finder"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finder-label"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className={empty ? "finder-field is-empty" : "finder-field"}>
          <IconSearch />
          <label id="finder-label" className="visually-hidden" htmlFor="finder-q">
            Buscar páginas
          </label>
          <input
            ref={inputRef}
            id="finder-q"
            className="finder-input"
            type="search"
            placeholder="Título o carpeta"
            value={query}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={empty ? "finder-empty" : hits.length === 0 ? "finder-hint" : undefined}
            aria-controls={listId}
            aria-expanded={hits.length > 0}
            aria-activedescendant={activeHit ? `${listId}-${active}` : undefined}
            role="combobox"
            onChange={(ev) => onQuery(ev.target.value)}
          />
        </div>
        {empty ? (
          <p id="finder-empty" className="finder-empty" role="status">
            Nada coincide con “{q}”. Prueba el título o parte de la ruta.
          </p>
        ) : hits.length === 0 ? (
          <p id="finder-hint" className="finder-empty">
            Escribe un título, una carpeta o parte de la ruta.
          </p>
        ) : (
          <ul id={listId} className="finder-list" role="listbox" aria-label="Resultados">
            {hits.map((hit, index) => {
              const selected = index === active;
              return (
                <li key={`${hit.kind}:${hit.path}`} role="presentation">
                  <button
                    ref={selected ? activeRef : undefined}
                    type="button"
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={selected}
                    className={selected ? "finder-hit is-active" : "finder-hit"}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(hit)}
                  >
                    <span className="tree-glyph">{hit.kind === "folder" ? <IconFolder /> : <IconPage />}</span>
                    <span className="finder-copy">
                      <span className="finder-title">
                        <Highlight text={hit.title} query={q} />
                      </span>
                      {hit.trail ? <span className="finder-trail">{hit.trail}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="finder-foot">
          <span>↑↓</span> mover · <span>↵</span> abrir · <span>esc</span> cerrar
        </p>
      </div>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) {
    return text;
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  const needle = query.toLowerCase();
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === needle ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>,
      )}
    </>
  );
}
