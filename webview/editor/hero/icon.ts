import type { FrontmatterFields, WebviewToHost } from "../../../src/domain/protocol";
import { normalizePageIcon } from "../../../src/domain/pageIcon";
import { filterEmoji } from "./emojiCatalog";
import {
  buildIconCategories,
  focusIconCell,
  handleIconGridKeydown,
  placeIconPicker,
  renderIconGrid,
  syncIconCatTabs,
  type IconPickerEls,
  type IconPickerView,
} from "./iconPicker";

type IconDeps = {
  vscode: { postMessage(message: WebviewToHost): void };
};

export function mountIcon(
  deps: IconDeps,
  initial: FrontmatterFields,
): { apply(fields: FrontmatterFields): void } {
  const pageEl = document.getElementById("page")!;
  const addBtn = document.getElementById("icon-add") as HTMLButtonElement;
  const heroBtn = document.getElementById("hero-icon") as HTMLButtonElement;
  const wrapEl = document.getElementById("hero-icon-wrap")!;
  const pickerEl = document.getElementById("icon-picker")!;
  const searchEl = document.getElementById("icon-search") as HTMLInputElement;
  const randomBtn = document.getElementById("icon-random") as HTMLButtonElement;
  const removeBtn = document.getElementById("icon-remove") as HTMLButtonElement;
  const catsEl = document.getElementById("icon-cats")!;
  const gridEl = document.getElementById("icon-grid")!;

  const els: IconPickerEls = { pageEl, pickerEl, searchEl, catsEl, gridEl };

  let icon = "";
  let open = false;
  let view: IconPickerView = { query: "", activeCat: "", icon: "" };

  buildIconCategories(catsEl, (catId) => {
    view = { query: "", activeCat: view.activeCat === catId ? "" : catId, icon };
    searchEl.value = "";
    syncIconCatTabs(catsEl, view.activeCat);
    renderIconGrid(gridEl, view, selectIcon);
    if (view.activeCat) {
      gridEl.scrollTop = 0;
    }
  });
  apply(initial);

  addBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    togglePicker(!open, addBtn);
  });
  heroBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    togglePicker(!open, heroBtn);
  });
  randomBtn.addEventListener("click", () => {
    const pool = filterEmoji("");
    if (pool.length === 0) {
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    selectIcon(pick.glyph);
  });
  removeBtn.addEventListener("click", () => {
    selectIcon("");
  });
  searchEl.addEventListener("input", () => {
    view = { query: searchEl.value, activeCat: "", icon };
    syncIconCatTabs(catsEl, view.activeCat);
    renderIconGrid(gridEl, view, selectIcon);
  });
  searchEl.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      focusIconCell(gridEl, 0);
    }
  });

  gridEl.addEventListener("keydown", (ev) => handleIconGridKeydown(ev, gridEl, searchEl));

  document.addEventListener("pointerdown", (ev) => {
    if (!open) {
      return;
    }
    const target = ev.target as Node | null;
    if (pickerEl.contains(target) || addBtn.contains(target) || heroBtn.contains(target)) {
      return;
    }
    closePicker();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && open) {
      closePicker();
      (icon ? heroBtn : addBtn).focus();
    }
  });

  function apply(fields: FrontmatterFields): void {
    setIcon(normalizePageIcon(fields.icon));
  }

  function selectIcon(next: string): void {
    const value = normalizePageIcon(next);
    setIcon(value);
    deps.vscode.postMessage({ type: "frontmatter", field: "icon", value });
    closePicker();
  }

  function setIcon(next: string): void {
    icon = next;
    view = { ...view, icon };
    pageEl.classList.toggle("has-icon", Boolean(icon));
    wrapEl.hidden = !icon;
    heroBtn.hidden = !icon;
    heroBtn.textContent = icon;
    addBtn.hidden = Boolean(icon);
    removeBtn.disabled = !icon;
    heroBtn.setAttribute("aria-label", icon ? `Page icon ${icon}` : "Page icon");
  }

  function togglePicker(next: boolean, anchor: HTMLElement): void {
    open = next;
    pickerEl.hidden = !next;
    addBtn.setAttribute("aria-expanded", next ? "true" : "false");
    heroBtn.setAttribute("aria-expanded", next ? "true" : "false");
    if (!next) {
      pickerEl.classList.remove("icon-picker-floating");
      pickerEl.style.top = "";
      pickerEl.style.left = "";
      return;
    }
    view = { query: "", activeCat: "", icon };
    searchEl.value = "";
    syncIconCatTabs(catsEl, view.activeCat);
    renderIconGrid(gridEl, view, selectIcon);
    placeIconPicker(els, anchor);
    searchEl.focus();
  }

  function closePicker(): void {
    if (!open) {
      return;
    }
    togglePicker(false, addBtn);
  }

  return { apply };
}
