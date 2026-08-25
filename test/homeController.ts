import type { HomeContext, HomeDom } from "../packages/ui/src/home/context";
import { createHomeState, setRefreshBusy } from "../packages/ui/src/home/context";
import { handleHomeMessage } from "../packages/ui/src/home/homeController";
import type { HomeTreePayload } from "@slash-md/core/homeTypes";

function mockDom(): HomeDom {
  const el = (tag: string) => {
    const node = document.createElement(tag);
    document.body.appendChild(node);
    return node;
  };
  const btn = () => el("button") as HTMLButtonElement;
  const input = () => {
    const node = el("input") as HTMLInputElement;
    node.type = "text";
    return node;
  };
  return {
    repoEl: el("span"),
    statusEl: el("span"),
    treeEl: el("div"),
    stageInner: el("div"),
    newBtn: btn(),
    newFolderBtn: btn(),
    refreshBtn: btn(),
    initBtn: btn(),
    signInBtn: btn(),
    searchInput: input(),
    configBtn: btn(),
  };
}

function emptyPayload(overrides: Partial<HomeTreePayload> = {}): HomeTreePayload {
  return {
    repo: "acme/docs",
    contentPath: "docs",
    needsAuth: false,
    needsInit: false,
    fromWorkspace: true,
    roots: [],
    drafts: [],
    selected: [],
    inbox: [],
    canPublishBatch: false,
    ...overrides,
  };
}

function mockContext(): HomeContext {
  const dom = mockDom();
  const state = createHomeState();
  return {
    dom,
    state,
    post: () => {},
    refresh: () => {},
    refreshStage: () => {},
  };
}

export function runHomeControllerTests(assert: (ok: boolean, message: string) => void): void {
  {
    const ctx = mockContext();
    handleHomeMessage(ctx, {} as never);
    assert(ctx.dom.statusEl.textContent === "", "handleHomeMessage ignores message without type");
  }
  {
    const ctx = mockContext();
    handleHomeMessage(ctx, { type: "status", message: "Syncing…" });
    assert(ctx.dom.statusEl.textContent === "Syncing…", "status message updates status bar");
  }

  {
    const ctx = mockContext();
    setRefreshBusy(ctx, true);
    const payload = emptyPayload({ repo: "org/wiki", roots: [{ kind: "file", path: "docs/a.md", title: "A" }] });
    handleHomeMessage(ctx, { type: "tree", payload });
    assert(ctx.state.lastPayload === payload, "tree message stores payload");
    assert(ctx.dom.refreshBtn.disabled === false, "tree message clears refresh busy");
    assert(ctx.dom.repoEl.textContent === "org/wiki", "tree message renders sidebar repo label");
    assert(ctx.dom.stageInner.querySelector(".inbox") !== null, "tree message renders stage inbox section");
  }

  {
    const ctx = mockContext();
    handleHomeMessage(ctx, {
      type: "configResult",
      config: { contentPath: "docs", mode: "workspace" },
      ok: true,
    });
    assert(ctx.dom.stageInner.querySelector("h1")?.textContent === "Configuración", "configResult renders config panel");
    assert(ctx.dom.stageInner.querySelector(".config-toast-ok") !== null, "configResult shows save toast");
  }

  {
    const ctx = mockContext();
    handleHomeMessage(ctx, {
      type: "reviewPreview",
      items: [{ path: "docs/a.md", title: "Page A", badge: "draft", summary: "Cambios menores" }],
    });
    const modal = document.getElementById("review-preview-modal");
    assert(modal !== null, "reviewPreview opens confirmation modal");
    assert(modal?.querySelector(".review-modal-title")?.textContent === "Page A", "reviewPreview lists selected page");
    modal?.remove();
  }
}
