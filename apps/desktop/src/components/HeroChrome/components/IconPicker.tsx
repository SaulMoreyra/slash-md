import { useEffect, useState } from "react";
import { Button, SearchField } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { filterEmoji } from "@slash-md/ui/editor/hero/emojiCatalog";
import { IconDice, IconTrash } from "../../icons";
import { useIconPickerPlacement } from "../hooks/useIconPickerPlacement";

type Props = {
  current: string;
  anchor: HTMLElement | null;
  onSelect: (icon: string) => void;
  onClose: () => void;
};

export function IconPicker({ current, anchor, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const items = filterEmoji(query);
  const pickerRef = useIconPickerPlacement({ anchor, query });

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      if (!(ev.target instanceof Node)) {
        return;
      }
      if (!pickerRef.current?.contains(ev.target)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [onClose, pickerRef]);

  return (
    <div ref={pickerRef} className="icon-picker icon-picker-floating" role="dialog" aria-label={t("hero.chooseIcon")}>
      <div className="icon-picker-head">
        <SearchField aria-label={t("hero.filterIcons")} value={query} onChange={setQuery} className="flex-1" fullWidth>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="icon-search" placeholder={t("hero.filterPlaceholder")} autoFocus />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t("hero.random")}
          onPress={() => {
            const pool = filterEmoji("");
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick) {
              onSelect(pick.glyph);
            }
          }}
        >
          <IconDice />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t("hero.remove")}
          isDisabled={!current}
          onPress={() => onSelect("")}
        >
          <IconTrash />
        </Button>
      </div>
      <IconGrid items={items} current={current} onSelect={onSelect} />
    </div>
  );
}

function IconGrid({
  items,
  current,
  onSelect,
}: {
  items: ReturnType<typeof filterEmoji>;
  current: string;
  onSelect: (icon: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="icon-grid">
      <div className="icon-cells" role="listbox" aria-label={t("hero.chooseIcon")}>
        {items.map((item) => (
          <button
            key={`${item.glyph}-${item.name}`}
            type="button"
            role="option"
            aria-selected={item.glyph === current}
            className={item.glyph === current ? "icon-cell is-selected" : "icon-cell"}
            aria-label={item.name}
            title={item.name}
            onClick={() => onSelect(item.glyph)}
          >
            {item.glyph}
          </button>
        ))}
      </div>
    </div>
  );
}
