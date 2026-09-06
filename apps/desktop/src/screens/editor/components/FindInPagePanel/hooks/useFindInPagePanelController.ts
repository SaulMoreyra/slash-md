import { useEffect, type KeyboardEvent, type RefObject } from "react";

type Params = {
  open: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
};

export function useFindInPagePanelController({ open, inputRef, onNext, onPrev, onClose }: Params) {
  useEffect(() => {
    if (!open) {
      return;
    }
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [open, inputRef]);

  function onInputKeyDown(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (ev.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
      return;
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      onClose();
    }
  }

  return { onInputKeyDown };
}
