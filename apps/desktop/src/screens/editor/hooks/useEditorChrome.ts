import { useEffect, useRef, useState } from "react";
import type { PagePayload } from "../../../../shared/api";

const api = () => window.slashmd;

type Params = {
  page: PagePayload;
  onPage: (page: PagePayload) => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  onFlushSave: () => Promise<void>;
};

export function useEditorChrome({ page, onPage, run, onFlushSave }: Params) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }
    const onPointer = (ev: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(ev.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setMoreOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  function onMoreToggle() {
    setMoreOpen((current) => !current);
  }

  function onMoreClose() {
    setMoreOpen(false);
  }

  async function onReviewOpen() {
    await onFlushSave();
    setReviewOpen(true);
  }

  function onReviewClose() {
    setReviewOpen(false);
  }

  async function onReviewSend(reviewers: string, excludePaths?: string[]) {
    const result = await run(() => api().reviewBatch(reviewers, excludePaths));
    if (!result) {
      return;
    }
    setReviewOpen(false);
    onPage(await api().openPage(page.path));
    if (result.created) {
      await api().openUrl(result.prUrl);
    }
  }

  async function onPublishPersonal() {
    const result = await run(() => api().publishPersonal(page.path));
    if (result) {
      await api().openUrl(result.url);
      onPage(await api().openPage(page.path));
    }
  }

  return {
    moreOpen,
    moreRef,
    reviewOpen,
    onMoreToggle,
    onMoreClose,
    onReviewOpen,
    onReviewClose,
    onReviewSend,
    onPublishPersonal,
  };
}

export type EditorChromeApi = ReturnType<typeof useEditorChrome>;
