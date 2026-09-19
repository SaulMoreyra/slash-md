import { useLayoutEffect, useRef } from "react";
import { computePanelPosition } from "../utils";

type Params = {
  anchor: HTMLElement | null;
  query: string;
};

/**
 * Anchors the floating `.icon-picker` to the element that opened it so the
 * panel sits beside the trigger instead of overlapping the editor content.
 * Keeps top/left in sync when the query resizes the grid.
 */
export function useIconPickerPlacement({ anchor, query }: Params) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const picker = pickerRef.current;
    if (!picker || !anchor) {
      return;
    }
    const host = picker.offsetParent as HTMLElement | null;
    if (!host) {
      return;
    }
    const { top, left } = computePanelPosition({
      anchorRect: anchor.getBoundingClientRect(),
      hostRect: host.getBoundingClientRect(),
      hostScrollTop: host.scrollTop,
      panelWidth: picker.offsetWidth || 340,
      panelHeight: picker.offsetHeight || 320,
    });
    picker.style.top = `${top}px`;
    picker.style.left = `${left}px`;
  }, [anchor, query]);

  return pickerRef;
}