import type { HostToWebview, WebviewToHost } from "../../../src/domain/protocol";
import type { VsCodeApi } from "../vscode";

export type ReviewContextHandle = {
  show(msg: Extract<HostToWebview, { type: "reviewContext" }>): void;
  hide(): void;
};

export function mountReviewContext(vscode: VsCodeApi): ReviewContextHandle {
  const el = document.getElementById("review-context");
  const textEl = document.getElementById("review-context-text");
  const openBtn = document.getElementById("review-context-open");
  const dismissBtn = document.getElementById("review-context-dismiss");
  if (!el || !textEl || !openBtn || !dismissBtn) {
    return { show: () => undefined, hide: () => undefined };
  }

  let prUrl = "";

  openBtn.addEventListener("click", () => {
    if (!prUrl) {
      return;
    }
    vscode.postMessage({ type: "openUrl", url: prUrl } satisfies WebviewToHost);
  });

  dismissBtn.addEventListener("click", () => {
    hide();
  });

  function hide(): void {
    el!.hidden = true;
    prUrl = "";
  }

  function show(msg: Extract<HostToWebview, { type: "reviewContext" }>): void {
    if (!msg.mismatch || !msg.prUrl) {
      hide();
      return;
    }
    prUrl = msg.prUrl;
    textEl!.textContent =
      msg.message?.trim() ||
      `Comments are on PR #${msg.prNumber}. You are viewing the local copy. Your changes were not touched.`;
    el!.hidden = false;
  }

  return { show, hide };
}
