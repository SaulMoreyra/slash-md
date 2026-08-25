import type { ReviewThread } from "@slash-md/core/protocol";
import type { VsCodeApi } from "../vscode";
import { renderThreadPopover } from "./threadPopover";
import { renderThreadRail } from "./threadRail";

export type ThreadChromeHandle = {
  showThread(thread: ReviewThread): void;
  setOrphans(orphans: ReviewThread[]): void;
  setCanWrite(canWrite: boolean): void;
  applyThreads(threads: ReviewThread[]): void;
  close(): void;
  destroy(): void;
};

export function mountThreadChrome(vscode: VsCodeApi): ThreadChromeHandle {
  const rail = document.getElementById("thread-rail");
  const popover = document.getElementById("thread-popover");
  if (!rail || !popover) {
    return {
      showThread() {},
      setOrphans() {},
      setCanWrite() {},
      applyThreads() {},
      close() {},
      destroy() {},
    };
  }

  let canWrite = false;
  let current: ReviewThread | undefined;

  const close = (): void => {
    current = undefined;
    popover.hidden = true;
  };

  const onDocPointerDown = (ev: PointerEvent) => {
    if (popover.hidden) {
      return;
    }
    const path = ev.composedPath();
    if (path.includes(popover) || path.includes(rail)) {
      return;
    }
    if ((ev.target as Element | null)?.closest?.(".slash-thread-mark")) {
      return;
    }
    close();
  };
  document.addEventListener("pointerdown", onDocPointerDown, true);

  const render = (thread: ReviewThread) => {
    current = thread;
    renderThreadPopover(popover, thread, vscode, canWrite, close);
    popover.hidden = false;
  };

  return {
    showThread: render,
    close,
    setOrphans(orphans) {
      renderThreadRail(rail, orphans, vscode, render);
    },
    setCanWrite(next) {
      canWrite = next;
      if (current && !popover.hidden) {
        render(current);
      }
    },
    applyThreads(threads) {
      if (!current || popover.hidden) {
        return;
      }
      const next = threads.find((thread) => thread.id === current?.id);
      if (!next) {
        close();
        return;
      }
      render(next);
    },
    destroy() {
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      close();
      rail.hidden = true;
      rail.replaceChildren();
    },
  };
}
