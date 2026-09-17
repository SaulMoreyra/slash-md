export type ResizeEdge = "left" | "right";

export const PAGE_WIDTH_DEFAULT = 800;
export const PAGE_WIDTH_MIN = 320;
export const PAGE_WIDTH_GUTTER = 24;
export const PAGE_WIDTH_STORAGE_KEY = "slashmd:editorWidth";
export const PAGE_WIDTH_STORAGE_CAP = 8192;

export function clampWidth(width: number, max: number): number {
  const floor = Math.max(max, PAGE_WIDTH_MIN);
  return Math.min(Math.max(width, PAGE_WIDTH_MIN), floor);
}

export function edgeMaxWidth(containerWidth: number): number {
  return Math.max(PAGE_WIDTH_MIN, containerWidth - PAGE_WIDTH_GUTTER * 2);
}

export function nextWidth(edge: ResizeEdge, startWidth: number, delta: number): number {
  return edge === "left" ? startWidth - delta : startWidth + delta;
}

export function readStoredWidth(fallback = PAGE_WIDTH_DEFAULT): number {
  const stored = window.localStorage.getItem(PAGE_WIDTH_STORAGE_KEY);
  if (stored === null) {
    return fallback;
  }
  const value = Number(stored);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return clampWidth(value, PAGE_WIDTH_STORAGE_CAP);
}

export function writeStoredWidth(width: number): void {
  window.localStorage.setItem(PAGE_WIDTH_STORAGE_KEY, String(Math.round(width)));
}

export function applyPageMeasure(el: HTMLElement, width: number): void {
  el.style.setProperty("--page-measure", `${Math.round(width)}px`);
}