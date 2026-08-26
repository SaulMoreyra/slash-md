import { useEffect, type RefObject } from "react";

export function useDismiss(open: boolean, rootRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (ev: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        onClose();
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, rootRef, onClose]);
}
