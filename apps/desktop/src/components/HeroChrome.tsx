import { useEffect, useRef, useState } from "react";
import { normalizePageIcon } from "@slash-md/core/pageIcon";
import type { FrontmatterFields } from "../../shared/api";
import { COVER_COLORS, coverColorHex, parsePosition } from "@slash-md/ui/editor/hero/coverModel";
import { filterEmoji } from "@slash-md/ui/editor/hero/emojiCatalog";

type Props = {
  fields: FrontmatterFields;
  imageMap: Record<string, string>;
  onPatch: (patch: Partial<FrontmatterFields>) => Promise<void>;
  onUploadCover: (file: File) => Promise<string>;
  children: React.ReactNode;
};

export function HeroChrome({ fields, imageMap, onPatch, onUploadCover, children }: Props) {
  const icon = normalizePageIcon(fields.icon);
  const cover = fields.cover.trim();
  const color = coverColorHex(cover);
  const coverSrc = !cover || color ? "" : imageMap[cover] ?? imageMap[cover.replace(/^\.\//, "")] ?? cover;
  const position = parsePosition(fields.coverPosition);
  const [coverMenu, setCoverMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {cover ? (
        <div
          className={color ? "cover is-color" : "cover"}
          style={color ? { background: color } : undefined}
        >
          {!color && coverSrc ? (
            <img
              className="cover-img"
              alt=""
              draggable={false}
              src={coverSrc}
              style={{ objectPosition: `50% ${position}%` }}
            />
          ) : null}
          <div className="cover-toolbar">
            <button type="button" className="cover-btn" onClick={() => setCoverMenu((open) => !open)}>
              Change
            </button>
            <button type="button" className="cover-btn" onClick={() => void onPatch({ cover: "", coverPosition: "" })}>
              Remove
            </button>
          </div>
        </div>
      ) : null}
      <div className="page-inner">
        <div className="page-chrome">
          {!icon ? (
            <button type="button" className="cover-add" onClick={() => setPicker(true)}>
              Add icon
            </button>
          ) : null}
          {!cover ? (
            <div className="cover-add-wrap">
              <button type="button" className="cover-add" onClick={() => setCoverMenu((open) => !open)}>
                Add cover
              </button>
            </div>
          ) : null}
        </div>
        {coverMenu ? (
          <CoverMenu
            onClose={() => setCoverMenu(false)}
            onColor={(hex) => {
              void onPatch({ cover: `color:${hex}`, coverPosition: "" });
              setCoverMenu(false);
            }}
            onUpload={() => {
              setCoverMenu(false);
              fileRef.current?.click();
            }}
          />
        ) : null}
        {icon ? (
          <div className="hero-icon-wrap">
            <button type="button" className="hero-icon" aria-label="Page icon" onClick={() => setPicker(true)}>
              {icon}
            </button>
          </div>
        ) : null}
        {picker ? (
          <IconPicker
            current={icon}
            onSelect={(next) => {
              void onPatch({ icon: next });
              setPicker(false);
            }}
            onClose={() => setPicker(false)}
          />
        ) : null}
        {children}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (ev) => {
          const file = ev.target.files?.[0];
          ev.target.value = "";
          if (!file) {
            return;
          }
          const src = await onUploadCover(file);
          await onPatch({ cover: src, coverPosition: "50" });
        }}
      />
    </>
  );
}

function CoverMenu({
  onClose,
  onColor,
  onUpload,
}: {
  onClose: () => void;
  onColor: (hex: string) => void;
  onUpload: () => void;
}) {
  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      if (!(ev.target instanceof Node)) {
        return;
      }
      const menu = document.getElementById("cover-menu");
      if (menu && !menu.contains(ev.target)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  return (
    <div id="cover-menu" className="cover-menu cover-menu-floating" role="dialog" aria-label="Cover">
      <button type="button" className="cover-menu-upload" onClick={onUpload}>
        Upload image
      </button>
      <p className="cover-menu-label">Color</p>
      <div className="cover-swatches">
        {COVER_COLORS.map((swatch) => (
          <button
            key={swatch.hex}
            type="button"
            className="cover-swatch"
            title={swatch.label}
            aria-label={swatch.label}
            style={{ background: swatch.hex }}
            onClick={() => onColor(swatch.hex)}
          />
        ))}
      </div>
    </div>
  );
}

function IconPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
}) {
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
    <div className="icon-picker icon-picker-floating" role="dialog" aria-label="Choose an icon">
      <div className="icon-picker-head">
        <input
          className="icon-search"
          type="search"
          placeholder="Filter…"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          autoFocus
        />
        <button
          type="button"
          className="icon-picker-btn"
          onClick={() => {
            const pool = filterEmoji("");
            const pick = pool[Math.floor(Math.random() * pool.length)];
            if (pick) {
              onSelect(pick.glyph);
            }
          }}
        >
          Random
        </button>
        <button type="button" className="icon-picker-btn" disabled={!current} onClick={() => onSelect("")}>
          Remove
        </button>
      </div>
      <div className="icon-grid">
        <div className="icon-cells">
          {items.map((item) => (
            <button
              key={`${item.glyph}-${item.name}`}
              type="button"
              className={item.glyph === current ? "icon-cell is-current" : "icon-cell"}
              title={item.name}
              onClick={() => onSelect(item.glyph)}
            >
              {item.glyph}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
