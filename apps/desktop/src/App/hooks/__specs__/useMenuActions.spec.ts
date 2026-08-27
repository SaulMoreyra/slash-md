import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DesktopApi } from "../../../../shared/api";
import { MenuAction } from "../../../../shared/menu";
import { act, renderHook } from "../../../test/render";
import { useMenuActions } from "../useMenuActions";

describe("useMenuActions", () => {
  const onSearch = vi.fn();
  const onSettings = vi.fn();
  let emit: ((action: MenuAction) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    emit = undefined;
    window.slashmd = {
      onMenuAction: (listener: (action: MenuAction) => void) => {
        emit = listener;
        return () => {
          emit = undefined;
        };
      },
    } as unknown as DesktopApi;
  });

  const runHook = () =>
    renderHook(() =>
      useMenuActions({
        [MenuAction.Search]: onSearch,
        [MenuAction.Settings]: onSettings,
      }),
    );

  it("dispatches the matching native menu action", () => {
    runHook();
    act(() => {
      emit?.(MenuAction.Search);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSettings).not.toHaveBeenCalled();
  });

  it("ignores actions without a handler", () => {
    runHook();
    act(() => {
      emit?.(MenuAction.Refresh);
    });
    expect(onSearch).not.toHaveBeenCalled();
    expect(onSettings).not.toHaveBeenCalled();
  });
});
