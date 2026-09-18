import { useEffect, useRef } from "react";

const DEFAULT_MAX_HEIGHT = 160;

/**
 * Grows a textarea up to `maxHeight` pixels as `draft` changes and shrinks it
 * back when the draft empties. Past the cap it scrolls instead of growing.
 */
export function useAutoGrowTextArea(draft: string, maxHeight = DEFAULT_MAX_HEIGHT) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft, maxHeight]);

  return ref;
}