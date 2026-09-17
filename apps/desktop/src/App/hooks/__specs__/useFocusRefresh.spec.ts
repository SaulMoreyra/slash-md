import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "../../../test/render";
import { useFocusRefresh } from "../useFocusRefresh";

describe("useFocusRefresh", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onReloadPage = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes the workspace and the open page on window focus", () => {
    renderHook(() => useFocusRefresh({ onRefresh, onReloadPage }));

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onReloadPage).toHaveBeenCalledTimes(1);
  });

  it("throttles repeated focus events", () => {
    renderHook(() => useFocusRefresh({ onRefresh, onReloadPage }));

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("removes the focus listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useFocusRefresh({ onRefresh, onReloadPage }));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("focus", expect.any(Function));
  });
});