import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "../../../../test/render";
import { ModalKind, NavKind, RailMode } from "../../enums";
import type { NavView } from "../../types";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  const search = {
    open: false,
    onClose: vi.fn(),
    onToggle: vi.fn(),
    onOpen: vi.fn(),
  };
  const modals = {
    kind: ModalKind.None,
    onOpen: vi.fn(),
  };
  const nav = {
    isWorkspace: true,
    workPaneOpen: true,
    railOpen: false,
    railMode: RailMode.Docked,
    view: { kind: NavKind.Drafts } as NavView,
    onNavigate: vi.fn(),
    onToggleWorkDest: vi.fn(),
    onCloseWorkPane: vi.fn(),
    onToggleWorkPane: vi.fn(),
    onCloseRail: vi.fn(),
    onToggleRail: vi.fn(),
  };
  const onClosePage = vi.fn();
  const onRefresh = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runHook = (overrides: {
    pagePath?: string | null;
    search?: Partial<typeof search>;
    nav?: Partial<typeof nav>;
  } = {}) =>
    renderHook(() =>
      useKeyboardShortcuts({
        pagePath: overrides.pagePath ?? null,
        needsInit: false,
        canWrite: true,
        search: { ...search, ...overrides.search },
        modals,
        nav: { ...nav, ...overrides.nav },
        onClosePage,
        onRefresh,
        runOp: vi.fn(async (_op, fn) => fn()),
      }),
    );

  function press(init: KeyboardEventInit) {
    window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
  }

  it("toggles the work pane with mod+backslash", () => {
    runHook();
    press({ key: "\\", code: "Backslash", metaKey: true });
    expect(nav.onToggleWorkPane).toHaveBeenCalled();
    expect(nav.onToggleRail).not.toHaveBeenCalled();
  });

  it("toggles the rail with mod+shift+backslash", () => {
    runHook();
    press({ key: "|", code: "Backslash", metaKey: true, shiftKey: true });
    expect(nav.onToggleRail).toHaveBeenCalled();
    expect(nav.onToggleWorkPane).not.toHaveBeenCalled();
  });

  it("does not toggle the work pane while a folder is selected", () => {
    runHook({
      nav: { view: { kind: NavKind.Folder, path: "docs", title: "docs" } },
    });
    press({ key: "\\", code: "Backslash", metaKey: true });
    expect(nav.onToggleWorkPane).not.toHaveBeenCalled();
  });

  it("closes an overlay rail on escape before the work pane", () => {
    runHook({
      nav: { railOpen: true, railMode: RailMode.Overlay },
    });
    press({ key: "Escape" });
    expect(nav.onCloseRail).toHaveBeenCalled();
    expect(nav.onCloseWorkPane).not.toHaveBeenCalled();
  });

  it("toggles drafts with mod+1", () => {
    runHook();
    press({ key: "1", metaKey: true });
    expect(nav.onToggleWorkDest).toHaveBeenCalledWith({ kind: NavKind.Drafts });
  });

  it("switches to inbox with mod+3", () => {
    runHook();
    press({ key: "3", metaKey: true });
    expect(nav.onToggleWorkDest).toHaveBeenCalledWith({ kind: NavKind.Inbox });
  });
});
