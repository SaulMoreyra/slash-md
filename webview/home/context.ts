import type { HomeFromWebview } from "../../src/domain/homeProtocol";
import type { HomeTreePayload } from "../../src/home/homeTree";
import type { Selection } from "./types";
import { vscode } from "./vscode";

export type HomeDom = {
  repoEl: HTMLElement;
  statusEl: HTMLElement;
  treeEl: HTMLElement;
  stageInner: HTMLElement;
  newBtn: HTMLButtonElement;
  newFolderBtn: HTMLButtonElement;
  refreshBtn: HTMLButtonElement;
  initBtn: HTMLButtonElement;
  signInBtn: HTMLButtonElement;
  searchInput: HTMLInputElement;
  configBtn: HTMLButtonElement;
};

export type HomeState = {
  selectedSection: string | undefined;
  selection: Selection;
  lastPayload: HomeTreePayload | undefined;
  searchQuery: string;
};

export type HomeContext = {
  dom: HomeDom;
  state: HomeState;
  post: (message: HomeFromWebview) => void;
  /** Re-render sidebar tree and main stage. */
  refresh: () => void;
  /** Re-render main stage only (e.g. draft checkbox toggles). */
  refreshStage: () => void;
};

export function createHomeDom(): HomeDom {
  return {
    repoEl: document.getElementById("repo")!,
    statusEl: document.getElementById("status")!,
    treeEl: document.getElementById("tree")!,
    stageInner: document.getElementById("stage-inner")!,
    newBtn: document.getElementById("new") as HTMLButtonElement,
    newFolderBtn: document.getElementById("new-folder") as HTMLButtonElement,
    refreshBtn: document.getElementById("refresh") as HTMLButtonElement,
    initBtn: document.getElementById("init") as HTMLButtonElement,
    signInBtn: document.getElementById("signin") as HTMLButtonElement,
    searchInput: document.getElementById("search") as HTMLInputElement,
    configBtn: document.getElementById("config-btn") as HTMLButtonElement,
  };
}

export function createHomeState(): HomeState {
  return {
    selectedSection: undefined,
    selection: { kind: "none" },
    lastPayload: undefined,
    searchQuery: "",
  };
}

export function createHomeContext(
  dom: HomeDom,
  state: HomeState,
  refresh: () => void,
  refreshStage: () => void,
): HomeContext {
  return {
    dom,
    state,
    post: (message) => vscode.postMessage(message),
    refresh,
    refreshStage,
  };
}

export function setRefreshBusy(ctx: HomeContext, busy: boolean): void {
  const { refreshBtn } = ctx.dom;
  refreshBtn.disabled = busy;
  refreshBtn.setAttribute("aria-busy", busy ? "true" : "false");
  if (busy) {
    refreshBtn.dataset.state = "loading";
  } else {
    delete refreshBtn.dataset.state;
  }
}
