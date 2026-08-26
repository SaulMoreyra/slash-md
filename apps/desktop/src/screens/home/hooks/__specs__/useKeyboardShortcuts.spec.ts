import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "../../../../test/render";
import { ModalKind, NavKind, RailMode } from "../../enums";
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
    onNavigate: vi.fn(),
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

  it("closes an overlay rail on escape before the work pane", () => {
    runHook({
      nav: { railOpen: true, railMode: RailMode.Overlay },
    });
    press({ key: "Escape" });
    expect(nav.onCloseRail).toHaveBeenCalled();
    expect(nav.onCloseWorkPane).not.toHaveBeenCalled();
  });
});
