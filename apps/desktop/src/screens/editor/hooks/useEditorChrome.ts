import { useEffect, useRef, useState } from "react";
import type { PagePayload } from "../../../../shared/api";
import { AppOperation } from "../../../App/enums";
import type { RunOp } from "../../home/types";

const api = () => window.slashmd;

type Params = {
  page: PagePayload;
  onPage: (page: PagePayload) => void;
  onRefresh: () => Promise<void>;
  runOp: RunOp;
  onFlushSave: () => Promise<void>;
};

export function useEditorChrome({ page, onPage, onRefresh, runOp, onFlushSave }: Params) {
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
    const result = await runOp(AppOperation.ReviewBatch, () => api().reviewBatch(reviewers, excludePaths));
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
    const next = await runOp(AppOperation.PublishPersonal, async () => {
      await api().publishPersonal(page.path);
      await onRefresh();
      return api().openPage(page.path);
    });
    if (next) {
      onPage(next);
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
