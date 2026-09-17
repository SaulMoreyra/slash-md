import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRef } from "react";
import { t } from "i18next";
import { cleanup, renderWithProviders, screen, fireEvent } from "../../../../../test/render";
import { PageResizer } from "../PageResizer";

describe("PageResizer", () => {
  const onCommit = vi.fn();
  const onReset = vi.fn();

  function mount({ visible = true, width = 800 }: { visible?: boolean; width?: number } = {}) {
    const Host = () => {
      const containerRef = useRef<HTMLDivElement | null>(null);
      return (
        <div ref={containerRef} data-testid="host">
          <PageResizer
            visible={visible}
            width={width}
            containerRef={containerRef}
            onCommit={onCommit}
            onReset={onReset}
          />
        </div>
      );
    };
    const { container } = renderWithProviders(<Host />);
    const host = container.querySelector("[data-testid=host]") as HTMLDivElement;
    Object.defineProperty(host, "clientWidth", { value: 1200, configurable: true });
    return { host, wells: () => screen.queryAllByRole("separator") } as const;
  }

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    Object.defineProperty(Element.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("renders two resize wells with an accessible label", () => {
    const { wells } = mount();
    const [left, right] = wells();
    expect(wells()).toHaveLength(2);
    expect(left).toHaveClass("page-resize-well", "is-left");
    expect(right).toHaveClass("page-resize-well", "is-right");
    expect(left).toHaveAccessibleName(new RegExp(t("editor.pageResize.resize")));
  });

  it("renders nothing when there is no room to resize", () => {
    const { host } = mount({ visible: false });
    expect(host.querySelectorAll(".page-resize-well")).toHaveLength(0);
  });

  it("highlights the well while dragging", () => {
    const { wells } = mount();
    const [left, right] = wells();
    fireEvent.pointerDown(right, { clientX: 10, pointerId: 1 });
    expect(right.className).toContain("is-active");
    expect(left.className).not.toContain("is-active");
    fireEvent.pointerUp(right, { clientX: 10, pointerId: 1 });
    expect(right.className).not.toContain("is-active");
  });

  it("grows the page dragging the right well outward", () => {
    const { host, wells } = mount();
    const right = wells()[1];
    fireEvent.pointerDown(right, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(right, { clientX: 300, pointerId: 1 });
    expect(host.style.getPropertyValue("--page-measure")).toBe("1100px");
    fireEvent.pointerUp(right, { clientX: 300, pointerId: 1 });
    expect(onCommit).toHaveBeenCalledWith(1100);
  });

  it("shrinks the page dragging the left well inward", () => {
    const { wells } = mount();
    const [left] = wells();
    fireEvent.pointerDown(left, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(left, { clientX: 500, pointerId: 1 });
    fireEvent.pointerUp(left, { clientX: 500, pointerId: 1 });
    expect(onCommit).toHaveBeenCalledWith(500);
  });

  it("clamps to the container width", () => {
    const { wells } = mount();
    const [, right] = wells();
    fireEvent.pointerDown(right, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(right, { clientX: 4000, pointerId: 1 });
    fireEvent.pointerUp(right, { clientX: 4000, pointerId: 1 });
    expect(onCommit).toHaveBeenCalledWith(1152);
  });

  it("does not commit a plain click", () => {
    const { wells } = mount();
    const [, right] = wells();
    fireEvent.pointerDown(right, { clientX: 0, pointerId: 1 });
    fireEvent.pointerUp(right, { clientX: 1, pointerId: 1 });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("cancels the drag on Escape", () => {
    const { host, wells } = mount();
    const [, right] = wells();
    fireEvent.pointerDown(right, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(right, { clientX: 300, pointerId: 1 });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    fireEvent.pointerUp(right, { clientX: 300, pointerId: 1 });
    expect(host.style.getPropertyValue("--page-measure")).toBe("800px");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("resets the width on double-click", () => {
    const { wells } = mount();
    const [left] = wells();
    fireEvent.doubleClick(left);
    expect(onReset).toHaveBeenCalled();
  });
});