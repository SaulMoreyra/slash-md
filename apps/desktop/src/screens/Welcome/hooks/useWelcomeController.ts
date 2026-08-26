import { useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";

type Params = {
  busy: boolean;
  error: string | null;
  onOpenPath: (folderPath: string) => void;
};

export function useWelcomeController({ busy, error, onOpenPath }: Params) {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  function resetDrag() {
    setDragging(false);
  }

  function onDragEnter(ev: DragEvent<HTMLElement>) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!busy) {
      setDragging(true);
    }
  }

  function onDragOver(ev: DragEvent<HTMLElement>) {
    ev.preventDefault();
    ev.stopPropagation();
    ev.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(ev: DragEvent<HTMLElement>) {
    ev.preventDefault();
    if (ev.currentTarget === ev.target) {
      resetDrag();
    }
  }

  async function onDrop(ev: DragEvent<HTMLElement>) {
    ev.preventDefault();
    ev.stopPropagation();
    resetDrag();
    if (busy) {
      return;
    }
    setDropError(null);

    const file = ev.dataTransfer.files?.[0];
    if (!file) {
      setDropError(t("welcome.dropEmpty"));
      return;
    }

    const entry = ev.dataTransfer.items?.[0]?.webkitGetAsEntry?.();
    if (entry && !entry.isDirectory) {
      setDropError(t("welcome.dropNotFolder"));
      return;
    }

    try {
      const folderPath = await window.slashmd.resolveDroppedFolder(file);
      onOpenPath(folderPath);
    } catch {
      setDropError(t("welcome.dropNotFolder"));
    }
  }

  return {
    dragging,
    message: dropError || error,
    dropHint: dragging ? t("welcome.dropActive") : t("welcome.dropHint"),
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
