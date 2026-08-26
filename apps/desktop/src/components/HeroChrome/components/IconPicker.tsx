import { useEffect, useState } from "react";
import { Button, SearchField } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { filterEmoji } from "@slash-md/ui/editor/hero/emojiCatalog";

type Props = {
  current: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
};

export function IconPicker({ current, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const items = filterEmoji(query);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="icon-picker icon-picker-floating" role="dialog" aria-label={t("hero.chooseIcon")}>
      <div className="icon-picker-head">
        <SearchField aria-label={t("hero.filterIcons")} value={query} onChange={setQuery} className="flex-1" fullWidth>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="icon-search" placeholder={t("hero.filterPlaceholder")} autoFocus />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Button
          size="sm"
          variant="secondary"
          className="icon-picker-btn"
          onPress={() => {
            const pool = filterEmoji("");
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick) {
              onSelect(pick.glyph);
            }
          }}
        >
          {t("hero.random")}
        </Button>
        <Button size="sm" variant="secondary" className="icon-picker-btn" isDisabled={!current} onPress={() => onSelect("")}>
          {t("hero.remove")}
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
  return (
    <div className="icon-grid">
      <div className="icon-cells">
        {items.map((item) => (
          <Button
            key={`${item.glyph}-${item.name}`}
            size="sm"
            variant={item.glyph === current ? "secondary" : "ghost"}
            className={item.glyph === current ? "icon-cell is-current" : "icon-cell"}
            aria-label={item.name}
            onPress={() => onSelect(item.glyph)}
          >
            {item.glyph}
          </Button>
        ))}
      </div>
    </div>
  );
}
