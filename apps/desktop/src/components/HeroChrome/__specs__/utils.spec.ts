import { describe, expect, it } from "vitest";
import { computePanelPosition } from "../utils";

function rect(init: Partial<DOMRectInit> & Pick<DOMRect, "top" | "left" | "width" | "height">): DOMRect {
  return new DOMRect(init.left, init.top, init.width, init.height);
}

const ANCHOR = rect({ top: 100, left: 60, width: 28, height: 28 });

describe("computePanelPosition", () => {
  const base = {
    anchorRect: ANCHOR,
    hostRect: rect({ top: 0, left: 0, width: 900, height: 700 }),
    hostScrollTop: 0,
    panelWidth: 340,
    panelHeight: 320,
  };

  it("places the panel below-right of the anchor", () => {
    const { top, left } = computePanelPosition(base);
    expect(top).toBe(134);
    expect(left).toBe(60);
  });

  it("clamps the panel inside the host horizontally", () => {
    const nearRight = computePanelPosition({
      ...base,
      anchorRect: rect({ top: 100, left: 880, width: 28, height: 28 }),
    });
    expect(nearRight.left).toBe(900 - 340 - 8);

    const nearLeft = computePanelPosition({
      ...base,
      anchorRect: rect({ top: 100, left: 0, width: 28, height: 28 }),
    });
    expect(nearLeft.left).toBe(8);
  });

  it("flips above the anchor when there is no room below", () => {
    const { top } = computePanelPosition({
      ...base,
      anchorRect: rect({ top: 620, left: 60, width: 28, height: 28 }),
    });
    expect(top).toBe(620 - 320 - 6);
  });

  it("keeps the panel below when flipping is impossible", () => {
    const { top } = computePanelPosition({
      ...base,
      anchorRect: rect({ top: 20, left: 60, width: 28, height: 28 }),
    });
    expect(top).toBe(54);
  });

  it("accounts for host scroll when computing top", () => {
    const { top } = computePanelPosition({ ...base, hostScrollTop: 300 });
    expect(top).toBe(434);
  });
});