import { EMOJI_CATEGORIES, filterEmoji, type EmojiItem } from "./emojiCatalog";

export const ICON_GRID_COLS = 8;

export type IconPickerEls = {
  pageEl: HTMLElement;
  pickerEl: HTMLElement;
  searchEl: HTMLInputElement;
  catsEl: HTMLElement;
  gridEl: HTMLElement;
};

export type IconPickerView = {
  query: string;
  activeCat: string;
  icon: string;
};

export function placeIconPicker(els: Pick<IconPickerEls, "pageEl" | "pickerEl">, anchor: HTMLElement): void {
  const { pageEl, pickerEl } = els;
  pageEl.appendChild(pickerEl);
  pickerEl.classList.add("icon-picker-floating");
  const rect = anchor.getBoundingClientRect();
  const pageRect = pageEl.getBoundingClientRect();
  const top = rect.bottom - pageRect.top + pageEl.scrollTop + 6;
  const width = pickerEl.offsetWidth || 340;
  const left = Math.min(
    Math.max(8, rect.left - pageRect.left),
    Math.max(8, pageEl.clientWidth - width - 8),
  );
  pickerEl.style.top = `${top}px`;
  pickerEl.style.left = `${left}px`;
  const pickerHeight = pickerEl.offsetHeight || 320;
  const spaceBelow = pageEl.clientHeight - (rect.bottom - pageRect.top);
  if (spaceBelow < pickerHeight + 8 && rect.top - pageRect.top > pickerHeight) {
    pickerEl.style.top = `${rect.top - pageRect.top + pageEl.scrollTop - pickerHeight - 6}px`;
  }
}

export function buildIconCategories(
  catsEl: HTMLElement,
  onSelect: (catId: string) => void,
): void {
  catsEl.replaceChildren();
  for (const cat of EMOJI_CATEGORIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-cat";
    btn.textContent = cat.hint;
    btn.title = cat.label;
    btn.setAttribute("aria-label", cat.label);
    btn.dataset.cat = cat.id;
    btn.addEventListener("click", () => onSelect(cat.id));
    catsEl.appendChild(btn);
  }
}

export function syncIconCatTabs(catsEl: HTMLElement, activeCat: string): void {
  for (const btn of Array.from(catsEl.querySelectorAll<HTMLButtonElement>(".icon-cat"))) {
    const on = Boolean(activeCat) && btn.dataset.cat === activeCat;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-current", on ? "true" : "false");
  }
}

export function renderIconGrid(
  gridEl: HTMLElement,
  view: IconPickerView,
  onSelect: (glyph: string) => void,
): EmojiItem[] {
  gridEl.replaceChildren();
  const q = view.query.trim();
  if (q) {
    const visible = filterEmoji(q);
    if (visible.length === 0) {
      const empty = document.createElement("p");
      empty.className = "icon-empty";
      empty.textContent = "No matches";
      gridEl.appendChild(empty);
      return visible;
    }
    gridEl.appendChild(makeIconGrid(view.icon, visible, onSelect));
    return visible;
  }

  const visible: EmojiItem[] = [];
  for (const cat of EMOJI_CATEGORIES) {
    if (view.activeCat && cat.id !== view.activeCat) {
      continue;
    }
    visible.push(...cat.items);
    const head = document.createElement("p");
    head.className = "icon-section";
    head.dataset.section = cat.id;
    head.textContent = cat.label;
    gridEl.appendChild(head);
    gridEl.appendChild(makeIconGrid(view.icon, cat.items, onSelect));
  }
  return visible;
}

function makeIconGrid(
  selected: string,
  items: EmojiItem[],
  onSelect: (glyph: string) => void,
): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "icon-cells";
  row.setAttribute("role", "listbox");
  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-cell";
    btn.textContent = item.glyph;
    btn.title = item.name.split(" ")[0] ?? item.glyph;
    btn.setAttribute("aria-label", item.name);
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", item.glyph === selected ? "true" : "false");
    if (item.glyph === selected) {
      btn.classList.add("is-selected");
    }
    btn.addEventListener("click", () => onSelect(item.glyph));
    row.appendChild(btn);
  }
  return row;
}

export function iconGridCells(gridEl: HTMLElement): HTMLButtonElement[] {
  return Array.from(gridEl.querySelectorAll<HTMLButtonElement>(".icon-cell"));
}

export function focusIconCell(gridEl: HTMLElement, index: number): void {
  iconGridCells(gridEl)[index]?.focus();
}

export function handleIconGridKeydown(
  ev: KeyboardEvent,
  gridEl: HTMLElement,
  searchEl: HTMLInputElement,
): void {
  const cells = iconGridCells(gridEl);
  const idx = cells.indexOf(document.activeElement as HTMLButtonElement);
  if (idx < 0) {
    return;
  }
  if (ev.key === "ArrowRight") {
    ev.preventDefault();
    focusIconCell(gridEl, Math.min(cells.length - 1, idx + 1));
  } else if (ev.key === "ArrowLeft") {
    ev.preventDefault();
    focusIconCell(gridEl, Math.max(0, idx - 1));
  } else if (ev.key === "ArrowDown") {
    ev.preventDefault();
    focusIconCell(gridEl, Math.min(cells.length - 1, idx + ICON_GRID_COLS));
  } else if (ev.key === "ArrowUp") {
    ev.preventDefault();
    if (idx < ICON_GRID_COLS) {
      searchEl.focus();
    } else {
      focusIconCell(gridEl, idx - ICON_GRID_COLS);
    }
  } else if (ev.key === "Home") {
    ev.preventDefault();
    focusIconCell(gridEl, 0);
  } else if (ev.key === "End") {
    ev.preventDefault();
    focusIconCell(gridEl, cells.length - 1);
  }
}
