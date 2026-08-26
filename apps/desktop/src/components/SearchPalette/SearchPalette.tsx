import { Modal as HeroModal } from "@heroui/react";
import type { LibraryHit } from "@slash-md/ui/home/utils/tree";
import { useTranslation } from "react-i18next";
import { IconSearch } from "../icons";
import { ShortcutKbd } from "../ShortcutKbd";
import { SearchResults } from "./components/SearchResults";
import { useSearchPaletteController } from "./hooks/useSearchPaletteController";

export type SearchPaletteProps = {
  query: string;
  hits: LibraryHit[];
  onQuery: (value: string) => void;
  onClose: () => void;
  onOpenFile: (path: string) => void;
  onOpenFolder: (path: string, title: string) => void;
};

export function SearchPalette({
  query,
  hits,
  onQuery,
  onClose,
  onOpenFile,
  onOpenFolder,
}: SearchPaletteProps) {
  const { t } = useTranslation();
  const { listId, inputRef, activeRef, active, q, empty, activeHit, onActivate, onChoose } =
    useSearchPaletteController({ query, hits, onClose, onOpenFile, onOpenFolder });

  return (
    <HeroModal.Backdrop
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <HeroModal.Container size="lg">
        <HeroModal.Dialog className="bg-surface">
          <HeroModal.CloseTrigger />
          <HeroModal.Header className="sr-only">
            <HeroModal.Heading>{t("search.label")}</HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex max-h-[min(36rem,80vh)] flex-col gap-6 px-8 py-10">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-muted">
                <IconSearch size={28} />
              </span>
              <input
                ref={inputRef}
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted/40"
                value={query}
                placeholder={t("search.placeholder")}
                aria-label={t("search.label")}
                autoComplete="off"
                spellCheck={false}
                autoFocus
                aria-controls={listId}
                aria-expanded={hits.length > 0}
                aria-activedescendant={activeHit ? `${listId}-${active}` : undefined}
                role="combobox"
                onChange={(ev) => onQuery(ev.target.value)}
              />
            </div>
            <SearchResults
              empty={empty}
              query={q}
              hits={hits}
              listId={listId}
              active={active}
              activeRef={activeRef}
              onActivate={onActivate}
              onChoose={onChoose}
            />
            <p className="text-xs text-muted">
              <ShortcutKbd keys="↑↓" /> {t("search.footMove")} · <ShortcutKbd keys="↵" />{" "}
              {t("search.footOpen")} · <ShortcutKbd keys="esc" /> {t("search.footClose")}
            </p>
          </HeroModal.Body>
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  );
}
