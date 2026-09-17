import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PagePayload } from "../../../../shared/api";
import { act, renderHook } from "../../../test/render";
import { AppOperation } from "../../enums";
import type { RunOp } from "../useOperationsController";
import { useTabs } from "../useTabs";

function mockPage(path: string, markdown = "# Hello"): PagePayload {
  return {
    path,
    markdown,
    frontmatter: emptyFrontmatter(),
    savedAt: null,
    pageKind: "wiki",
    repoMode: "personal",
    publishEnabled: true,
    reviewable: true,
    prUrl: null,
  };
}

describe("useTabs", () => {
  const runOp = vi.fn(async <T,>(_op: AppOperation, fn: () => Promise<T>) => fn());
  const openPage = vi.fn(async (path: string) => mockPage(path, `# ${path}`));

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { openPage },
    });
  });

  const runHook = () => renderHook(() => useTabs({ runOp: runOp as unknown as RunOp }));

  it("opens a page as a new tab and sets it active", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
    });
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].key).toBe("docs/a.md");
    expect(result.current.activeKey).toBe("docs/a.md");
    expect(result.current.page?.path).toBe("docs/a.md");
  });

  it("focuses an already-open tab instead of duplicating it", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      await result.current.onOpenPage("docs/b.md");
      await result.current.onOpenPage("docs/a.md");
    });
    expect(result.current.tabs.map((t) => t.key)).toEqual(["docs/a.md", "docs/b.md"]);
    expect(result.current.activeKey).toBe("docs/a.md");
    expect(openPage).toHaveBeenCalledTimes(2);
  });

  it("updates the focusThreadId when opening an already-open tab with a thread", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      await result.current.onOpenPage("docs/a.md", "thread-1");
    });
    expect(result.current.tabs[0].focusThreadId).toBe("thread-1");
  });

  it("switches tabs via onActivateTab", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      await result.current.onOpenPage("docs/b.md");
      result.current.onActivateTab("docs/a.md");
    });
    expect(result.current.activeKey).toBe("docs/a.md");
    expect(result.current.page?.path).toBe("docs/a.md");
  });

  it("closing the active tab activates the right neighbor", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      await result.current.onOpenPage("docs/b.md");
      await result.current.onOpenPage("docs/c.md");
      result.current.onActivateTab("docs/b.md");
      result.current.onCloseTab("docs/b.md");
    });
    expect(result.current.tabs.map((t) => t.key)).toEqual(["docs/a.md", "docs/c.md"]);
    expect(result.current.activeKey).toBe("docs/c.md");
  });

  it("closing the rightmost tab activates the one before it", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      await result.current.onOpenPage("docs/b.md");
      result.current.onActivateTab("docs/b.md");
      result.current.onCloseTab("docs/b.md");
    });
    expect(result.current.tabs.map((t) => t.key)).toEqual(["docs/a.md"]);
    expect(result.current.activeKey).toBe("docs/a.md");
  });

  it("closing a non-active tab keeps the active tab", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      await result.current.onOpenPage("docs/b.md");
      result.current.onActivateTab("docs/b.md");
      result.current.onCloseTab("docs/a.md");
    });
    expect(result.current.tabs.map((t) => t.key)).toEqual(["docs/b.md"]);
    expect(result.current.activeKey).toBe("docs/b.md");
  });

  it("closing the last tab returns to a blank session", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      result.current.onClosePage();
    });
    expect(result.current.tabs).toHaveLength(0);
    expect(result.current.activeKey).toBeNull();
    expect(result.current.page).toBeNull();
  });

  it("clears every tab with onCloseAllPages", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      await result.current.onOpenPage("docs/b.md");
      result.current.onCloseAllPages();
    });
    expect(result.current.tabs).toHaveLength(0);
    expect(result.current.activeKey).toBeNull();
  });

  it("closes tabs under a deleted prefix", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/deep/a.md");
      await result.current.onOpenPage("docs/deep/b.md");
      await result.current.onOpenPage("docs/keep.md");
      result.current.onCloseTabsUnder("docs/deep");
    });
    expect(result.current.tabs.map((t) => t.key)).toEqual(["docs/keep.md"]);
  });

  it("rewrites tab keys and page paths after a rename", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/old.md");
      await result.current.onOpenPage("docs/old/deep/b.md");
      await result.current.onActivateTab("docs/old/deep/b.md");
      result.current.onRewritePath("docs/old", "docs/new");
    });
    expect(result.current.tabs.map((t) => t.key)).toEqual([
      "docs/old.md",
      "docs/new/deep/b.md",
    ]);
    expect(result.current.tabs[1].page.path).toBe("docs/new/deep/b.md");
    expect(result.current.activeKey).toBe("docs/new/deep/b.md");
  });

  it("updates the page for the tab matching onPage", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      await result.current.onOpenPage("docs/b.md");
      result.current.onActivateTab("docs/a.md");
    });
    await act(async () => {
      result.current.onPage(mockPage("docs/a.md", "# updated"));
    });
    const tab = result.current.tabs.find((t) => t.key === "docs/a.md");
    expect(tab?.page.markdown).toBe("# updated");
    expect(result.current.page?.markdown).toBe("# updated");
  });

  it("reloads only the active tab", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      await result.current.onOpenPage("docs/b.md");
      await result.current.onActivateTab("docs/b.md");
    });
    runOp.mockClear();
    await act(async () => {
      await result.current.onReloadPage();
    });
    expect(openPage).toHaveBeenLastCalledWith("docs/b.md");
    expect(result.current.page?.markdown).toBe("# docs/b.md");
    expect(runOp).not.toHaveBeenCalled();
  });

  it("does nothing when reloading with no open tab", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onReloadPage();
    });
    expect(openPage).not.toHaveBeenCalled();
  });

  it("tracks dirty state per tab without churn", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
      result.current.onDirtyChange("docs/a.md", true);
    });
    expect(result.current.tabs[0].dirty).toBe(true);
    const sameTabs = result.current.tabs;
    await act(async () => {
      result.current.onDirtyChange("docs/a.md", true);
    });
    expect(result.current.tabs).toBe(sameTabs);
    await act(async () => {
      result.current.onDirtyChange("docs/a.md", false);
    });
    expect(result.current.tabs[0].dirty).toBe(false);
  });
});