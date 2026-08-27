import { useState } from "react";
import { ModalKind } from "../enums";
import type { DiscardPublicationTarget, ModalTarget } from "../types";

export type ModalsApi = ReturnType<typeof useModals>;

export function useModals() {
  const [kind, setKind] = useState(ModalKind.None);
  const [target, setTarget] = useState<ModalTarget | null>(null);
  const [discardTarget, setDiscardTarget] = useState<DiscardPublicationTarget | null>(null);
  const [folderParent, setFolderParent] = useState<string | undefined>();

  function onOpen(next: ModalKind, nextTarget?: ModalTarget | null) {
    setKind(next);
    setTarget(nextTarget ?? null);
    setDiscardTarget(null);
    setFolderParent(undefined);
  }

  function onOpenFolderModal(parent?: string) {
    setKind(ModalKind.Folder);
    setTarget(null);
    setDiscardTarget(null);
    setFolderParent(parent);
  }

  function onOpenDiscard(next: DiscardPublicationTarget) {
    setKind(ModalKind.DiscardPublication);
    setTarget(null);
    setFolderParent(undefined);
    setDiscardTarget(next);
  }

  function onClose() {
    setKind(ModalKind.None);
    setTarget(null);
    setDiscardTarget(null);
    setFolderParent(undefined);
  }

  return {
    kind,
    target,
    discardTarget,
    folderParent,
    onOpen,
    onOpenFolderModal,
    onOpenDiscard,
    onClose,
  };
}
