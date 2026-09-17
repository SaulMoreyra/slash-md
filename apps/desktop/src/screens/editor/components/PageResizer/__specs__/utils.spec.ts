import { describe, it, expect, beforeEach } from "vitest";
import {
  applyPageMeasure,
  clampWidth,
  edgeMaxWidth,
  nextWidth,
  PAGE_WIDTH_DEFAULT,
  PAGE_WIDTH_MIN,
  PAGE_WIDTH_STORAGE_KEY,
  readStoredWidth,
  writeStoredWidth,
} from "../utils";

describe("PageResizer utils", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("clamps within min and max", () => {
    expect(clampWidth(1200, 1152)).toBe(1152);
    expect(clampWidth(100, 1152)).toBe(PAGE_WIDTH_MIN);
    expect(clampWidth(900, 1152)).toBe(900);
    expect(clampWidth(500, 320)).toBe(320);
  });

  it("never shrinks the max below the min width", () => {
    expect(edgeMaxWidth(100)).toBe(PAGE_WIDTH_MIN);
    expect(edgeMaxWidth(2000)).toBe(1952);
  });

  it("grows on the right edge and shrinks on the left edge", () => {
    expect(nextWidth("right", 800, 120)).toBe(920);
    expect(nextWidth("left", 800, -120)).toBe(920);
    expect(nextWidth("right", 800, -120)).toBe(680);
  });

  it("reads the stored width or falls back when empty, missing, or invalid", () => {
    expect(readStoredWidth()).toBe(PAGE_WIDTH_DEFAULT);
    expect(readStoredWidth(700)).toBe(700);
    window.localStorage.setItem(PAGE_WIDTH_STORAGE_KEY, "1000");
    expect(readStoredWidth()).toBe(1000);
    window.localStorage.setItem(PAGE_WIDTH_STORAGE_KEY, "not-a-number");
    expect(readStoredWidth()).toBe(PAGE_WIDTH_DEFAULT);
  });

  it("rounds and persists the committed width", () => {
    writeStoredWidth(923.4);
    expect(window.localStorage.getItem(PAGE_WIDTH_STORAGE_KEY)).toBe("923");
  });

  it("writes the page measure CSS variable in pixels", () => {
    const el = document.createElement("div");
    applyPageMeasure(el, 800.6);
    expect(el.style.getPropertyValue("--page-measure")).toBe("801px");
  });
});