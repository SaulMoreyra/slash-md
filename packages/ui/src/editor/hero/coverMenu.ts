import { COVER_COLORS } from "./coverModel";

type CoverMenuEls = {
  menuEl: HTMLElement;
  pageEl: HTMLElement;
  addBtn: HTMLButtonElement;
  changeBtn: HTMLButtonElement;
  swatchesEl: HTMLElement;
};

export function buildCoverSwatches(
  swatchesEl: HTMLElement,
  onSelect: (hex: string) => void,
): void {
  swatchesEl.replaceChildren();
  for (const swatch of COVER_COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cover-swatch";
    btn.title = swatch.label;
    btn.setAttribute("aria-label", swatch.label);
    btn.style.background = swatch.hex;
    btn.addEventListener("click", () => onSelect(swatch.hex));
    swatchesEl.appendChild(btn);
  }
}

export function toggleCoverMenu(
  els: CoverMenuEls,
  open: boolean,
  anchor: HTMLElement,
): void {
  const { menuEl, pageEl, addBtn, changeBtn } = els;
  menuEl.hidden = !open;
  addBtn.setAttribute("aria-expanded", open ? "true" : "false");
  if (!open) {
    const wrap = addBtn.closest(".cover-add-wrap");
    if (wrap && menuEl.parentElement !== wrap) {
      wrap.appendChild(menuEl);
    }
    menuEl.classList.remove("cover-menu-floating");
    menuEl.style.top = "";
    menuEl.style.left = "";
    return;
  }
  if (anchor === changeBtn) {
    pageEl.appendChild(menuEl);
    menuEl.classList.add("cover-menu-floating");
    const rect = changeBtn.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();
    menuEl.style.top = `${rect.bottom - pageRect.top + pageEl.scrollTop + 6}px`;
    menuEl.style.left = `${Math.max(8, rect.right - pageRect.left - 220)}px`;
  } else {
    const wrap = addBtn.closest(".cover-add-wrap");
    if (wrap) {
      wrap.appendChild(menuEl);
    }
    menuEl.classList.remove("cover-menu-floating");
    menuEl.style.top = "";
    menuEl.style.left = "";
  }
}

export function isCoverMenuTarget(
  els: Pick<CoverMenuEls, "menuEl" | "addBtn" | "changeBtn">,
  target: Node | null,
): boolean {
  if (!target) {
    return false;
  }
  return (
    els.menuEl.contains(target) || els.addBtn.contains(target) || els.changeBtn.contains(target)
  );
}
