import { useEffect, useState } from "react";
import { RAIL_OVERLAY_MAX_WIDTH, RailMode } from "../enums";

const OVERLAY_QUERY = `(max-width: ${RAIL_OVERLAY_MAX_WIDTH - 1}px)`;

function readOverlay(): boolean {
  return window.matchMedia(OVERLAY_QUERY).matches;
}

/** Docked rail on wide windows; overlay drawer when the shell is compact. */
export function useRailMode(): RailMode {
  const [overlay, setOverlay] = useState(readOverlay);

  useEffect(() => {
    const mq = window.matchMedia(OVERLAY_QUERY);
    const onChange = () => setOverlay(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return overlay ? RailMode.Overlay : RailMode.Docked;
}
