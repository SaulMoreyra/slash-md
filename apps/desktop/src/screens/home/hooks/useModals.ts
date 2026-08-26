import { useState } from "react";
import { ModalKind } from "../enums";
import type { ModalTarget } from "../types";

export type ModalsApi = ReturnType<typeof useModals>;

export function useModals() {
  const [kind, setKind] = useState(ModalKind.None);
  const [target, setTarget] = useState<ModalTarget | null>(null);

  function onOpen(next: ModalKind, nextTarget?: ModalTarget | null) {
    setKind(next);
    setTarget(nextTarget ?? null);
  }

  function onClose() {
    setKind(ModalKind.None);
    setTarget(null);
  }

  return {
    kind,
    target,
    onOpen,
    onClose,
  };
}
