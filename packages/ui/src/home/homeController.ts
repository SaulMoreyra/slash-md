import type { HomeToWebview } from "@slash-md/core/homeProtocol";
import type { HomeContext } from "./context";
import { setRefreshBusy } from "./context";
import { renderConfigPanel } from "./render/config";
import { showReviewPreviewModal } from "./render/reviewModal";
import { renderStage } from "./render/stage";
import { refreshSelectionFromPayload } from "./selection";
import { renderTree } from "./treeView";

export function wireHomeDom(ctx: HomeContext): void {
  const { dom, state } = ctx;

  dom.newBtn.addEventListener("click", () => {
    ctx.post({ type: "new", section: state.selectedSection });
  });
  dom.newFolderBtn.addEventListener("click", () => {
    ctx.post({ type: "newFolder", parent: state.selectedSection });
  });
  dom.refreshBtn.addEventListener("click", () => {
    setRefreshBusy(ctx, true);
    ctx.post({ type: "refresh" });
  });
  dom.initBtn.addEventListener("click", () => {
    ctx.post({ type: "init" });
  });
  dom.signInBtn.addEventListener("click", () => {
    ctx.post({ type: "signIn" });
  });
  dom.configBtn.addEventListener("click", () => {
    state.selection = { kind: "config" };
    ctx.post({ type: "getConfig" });
  });

  dom.searchInput.addEventListener("input", () => {
    state.searchQuery = dom.searchInput.value.trim().toLowerCase();
    if (state.lastPayload) {
      ctx.refresh();
    }
  });
  dom.searchInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      dom.searchInput.value = "";
      state.searchQuery = "";
      if (state.lastPayload) {
        ctx.refresh();
      }
    }
  });
}

export function handleHomeMessage(ctx: HomeContext, msg: HomeToWebview): void {
  if (!msg?.type) {
    return;
  }
  if (msg.type === "status") {
    ctx.dom.statusEl.textContent = msg.message;
    return;
  }
  if (msg.type === "tree") {
    ctx.state.lastPayload = msg.payload;
    setRefreshBusy(ctx, false);
    refreshSelectionFromPayload(ctx, msg.payload);
    renderTree(ctx, msg.payload);
    renderStage(ctx);
    return;
  }
  if (msg.type === "configResult") {
    renderConfigPanel(ctx, msg.config, msg.ok, msg.error);
    return;
  }
  if (msg.type === "reviewPreview") {
    showReviewPreviewModal(ctx, msg.items);
  }
}

export function startHome(ctx: HomeContext): void {
  wireHomeDom(ctx);
  window.addEventListener("message", (event: MessageEvent<HomeToWebview>) => {
    handleHomeMessage(ctx, event.data);
  });
  renderStage(ctx);
  ctx.post({ type: "ready" });
}
