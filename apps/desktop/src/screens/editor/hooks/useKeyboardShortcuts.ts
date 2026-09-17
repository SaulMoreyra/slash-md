import { useEffect } from "react";
import type { CommentsApi } from "./useComments";
import type { EditorChromeApi } from "./useEditorChrome";
import type { FindInPageApi } from "./useFindInPage";
import type { FormatterApi } from "./useFormatter";
import type { ThreadsApi } from "./useThreads";

type Params = {
  onClose: () => void;
  active?: boolean;
  editor: Pick<FormatterApi, "onFlushSave">;
  threads: Pick<ThreadsApi, "openThread" | "onThreadClose">;
  comments: Pick<CommentsApi, "commentDraft" | "onCommentDraftCancel">;
  chrome: Pick<EditorChromeApi, "moreOpen" | "onMoreClose" | "reviewOpen" | "onReviewClose">;
  find: Pick<FindInPageApi, "open" | "onOpen" | "onClose" | "onFocusInput" | "onNext" | "onPrev">;
};

export function useKeyboardShortcuts({
  onClose,
  active = true,
  editor,
  threads,
  comments,
  chrome,
  find,
}: Params) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const onKey = (ev: KeyboardEvent) => {
      const mod = ev.metaKey || ev.ctrlKey;
      const key = ev.key.toLowerCase();

      if (ev.key === "Escape") {
        if (find.open) {
          ev.preventDefault();
          find.onClose();
          return;
        }
        if (chrome.moreOpen) {
          ev.preventDefault();
          chrome.onMoreClose();
          return;
        }
        if (threads.openThread) {
          ev.preventDefault();
          threads.onThreadClose();
          return;
        }
        if (comments.commentDraft) {
          ev.preventDefault();
          comments.onCommentDraftCancel();
          return;
        }
        if (chrome.reviewOpen) {
          ev.preventDefault();
          chrome.onReviewClose();
          return;
        }
        ev.preventDefault();
        onClose();
        return;
      }

      if (mod && !ev.altKey && key === "f" && !ev.shiftKey) {
        ev.preventDefault();
        if (find.open) {
          find.onFocusInput();
        } else {
          find.onOpen();
        }
        return;
      }

      if (mod && !ev.altKey && key === "s" && !ev.shiftKey) {
        ev.preventDefault();
        void editor.onFlushSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    active,
    find.open,
    find.onOpen,
    find.onClose,
    find.onFocusInput,
    find.onNext,
    find.onPrev,
    chrome.moreOpen,
    chrome.reviewOpen,
    chrome.onMoreClose,
    chrome.onReviewClose,
    threads.openThread,
    threads.onThreadClose,
    comments.commentDraft,
    comments.onCommentDraftCancel,
    editor.onFlushSave,
    onClose,
  ]);
}
