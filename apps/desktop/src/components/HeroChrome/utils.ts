export type PanelPlacement = {
  top: number;
  left: number;
};

export type PanelPlacementInput = {
  anchorRect: DOMRect;
  hostRect: DOMRect;
  hostScrollTop: number;
  panelWidth: number;
  panelHeight: number;
  gap?: number;
};

const EDGE_PAD = 8;
const FLIP_GAP = 6;

/**
 * Positions an absolutely-positioned panel next to an anchor within the host
 * (the panel's positioned ancestor). Mirrors `placeIconPicker` from the shared
 * vanilla chart: clamp horizontally and flip above the anchor when there is not
 * enough room below.
 */
export function computePanelPosition({
  anchorRect,
  hostRect,
  hostScrollTop,
  panelWidth,
  panelHeight,
  gap = FLIP_GAP,
}: PanelPlacementInput): PanelPlacement {
  const left = Math.min(
    Math.max(EDGE_PAD, anchorRect.left - hostRect.left),
    Math.max(EDGE_PAD, hostRect.width - panelWidth - EDGE_PAD),
  );
  const spaceBelow = hostRect.height - (anchorRect.bottom - hostRect.top);
  if (spaceBelow < panelHeight + gap && anchorRect.top - hostRect.top > panelHeight) {
    return {
      top: Math.max(EDGE_PAD, anchorRect.top - hostRect.top + hostScrollTop - panelHeight - gap),
      left,
    };
  }
  return {
    top: Math.max(EDGE_PAD, anchorRect.bottom - hostRect.top + hostScrollTop + gap),
    left,
  };
}