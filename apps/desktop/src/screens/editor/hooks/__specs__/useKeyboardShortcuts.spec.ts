import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "../../../../test/render";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";

describe("editor useKeyboardShortcuts", () => {
  const onClose = vi.fn();
  const editor = { onFlushSave: vi.fn(async () => undefined) };
  const threads = { openThread: null, onThreadClose: vi.fn() };
  const comments = { commentDraft: null as string | null, onCommentDraftCancel: vi.fn() };
  const chrome = {
    moreOpen: false,
    reviewOpen: false,
    onMoreClose: vi.fn(),
    onReviewClose: vi.fn(),
  };
  const find = {
    open: false,
    onOpen: vi.fn(),
    onClose: vi.fn(),
    onFocusInput: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runHook = (overrides: { find?: Partial<typeof find> } = {}) =>
    renderHook(() =>
      useKeyboardShortcuts({
        onClose,
        editor,
        threads,
        comments,
        chrome,
        find: { ...find, ...overrides.find },
      }),
    );

  function press(init: KeyboardEventInit) {
    window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
  }

  it("opens find with mod+f", () => {
    runHook();
    press({ key: "f", metaKey: true });
    expect(find.onOpen).toHaveBeenCalled();
  });

  it("closes find before closing the page on Escape", () => {
    runHook({ find: { open: true } });
    press({ key: "Escape" });
    expect(find.onClose).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
