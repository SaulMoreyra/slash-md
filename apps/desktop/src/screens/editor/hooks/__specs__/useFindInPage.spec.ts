import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "../../../../test/render";
import type { SearchHandle } from "@slash-md/ui/editor/plugins/search";
import { useFindInPage } from "../useFindInPage";

function mockHandle(): SearchHandle {
  return {
    search: vi.fn(() => ({ query: "foo", active: 1, total: 2 })),
    next: vi.fn(() => ({ query: "foo", active: 2, total: 2 })),
    prev: vi.fn(() => ({ query: "foo", active: 1, total: 2 })),
    clear: vi.fn(),
    getSelectionText: vi.fn(() => ""),
    subscribe: vi.fn(() => () => undefined),
  };
}

describe("useFindInPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("keeps the search handle after the query changes", async () => {
    const handle = mockHandle();
    const { result } = renderHook(() =>
      useFindInPage({
        docPath: "docs/a.md",
        onThreadClose: vi.fn(),
      }),
    );

    act(() => {
      result.current.onSearchReady(handle);
    });

    act(() => {
      result.current.onOpen();
    });

    act(() => {
      result.current.onQueryChange("foo");
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(handle.search).toHaveBeenCalledWith("foo");
  });
});
