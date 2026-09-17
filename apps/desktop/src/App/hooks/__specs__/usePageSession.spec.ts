import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PagePayload } from "../../../../shared/api";
import { act, renderHook } from "../../../test/render";
import { AppOperation } from "../../enums";
import { usePageSession } from "../usePageSession";
import type { RunOp } from "../useOperationsController";

function mockPage(overrides: Partial<PagePayload> = {}): PagePayload {
  return {
    path: "docs/a.md",
    markdown: "# Hello",
    frontmatter: emptyFrontmatter(),
    savedAt: null,
    pageKind: "wiki",
    repoMode: "personal",
    publishEnabled: true,
    reviewable: true,
    prUrl: null,
    ...overrides,
  };
}

describe("usePageSession", () => {
  const runOp = vi.fn(async <T,>(_op: AppOperation, fn: () => Promise<T>) => fn());
  const openPage = vi.fn(async (path: string) => mockPage({ path, markdown: "# v2" }));

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { openPage },
    });
  });

  const runHook = () => renderHook(() => usePageSession({ runOp: runOp as unknown as RunOp }));

  it("reloads the open page directly, without running an operation", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onOpenPage("docs/a.md");
    });
    expect(result.current.page?.path).toBe("docs/a.md");
    expect(runOp).toHaveBeenCalled();

    runOp.mockClear();
    await act(async () => {
      await result.current.onReloadPage();
    });
    expect(openPage).toHaveBeenLastCalledWith("docs/a.md");
    expect(result.current.page?.markdown).toBe("# v2");
    expect(runOp).not.toHaveBeenCalled();
  });

  it("does nothing when no page is open", async () => {
    const { result } = runHook();

    await act(async () => {
      await result.current.onReloadPage();
    });
    expect(openPage).not.toHaveBeenCalled();
  });
});