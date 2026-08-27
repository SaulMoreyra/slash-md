import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "../../../../test/render";
import type { PagePayload } from "../../../../../shared/api";
import { AppOperation } from "../../../../App/enums";
import type { RunOp } from "../../../home/types";
import { useEditorChrome } from "../useEditorChrome";

function mockPage(overrides: Partial<PagePayload> = {}): PagePayload {
  return {
    path: "docs/a.md",
    markdown: "",
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

describe("useEditorChrome", () => {
  const onPage = vi.fn();
  const onRefresh = vi.fn(async () => undefined);
  const onFlushSave = vi.fn(async () => undefined);
  const runOpFn = vi.fn(async <T,>(_op: AppOperation, fn: () => Promise<T>) => fn());
  const runOp = runOpFn as unknown as RunOp;
  const publishPersonal = vi.fn(async () => ({ url: "https://github.com/acme/docs/blob/main/docs/a.md" }));
  const openPage = vi.fn(async () => mockPage({ reviewable: false }));
  const openUrl = vi.fn(async () => undefined);
  const page = mockPage();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { publishPersonal, openPage, openUrl },
    });
  });

  const runHook = () =>
    renderHook(() =>
      useEditorChrome({
        page,
        onPage,
        onRefresh,
        runOp,
        onFlushSave,
      }),
    );

  it("refreshes the workspace after a personal publish without opening GitHub", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.onPublishPersonal();
    });

    expect(runOpFn).toHaveBeenCalledWith(AppOperation.PublishPersonal, expect.any(Function));
    expect(publishPersonal).toHaveBeenCalledWith("docs/a.md");
    expect(onRefresh).toHaveBeenCalled();
    expect(openPage).toHaveBeenCalledWith("docs/a.md");
    expect(onPage).toHaveBeenCalledWith(expect.objectContaining({ path: "docs/a.md", reviewable: false }));
    expect(openUrl).not.toHaveBeenCalled();
    expect(onRefresh.mock.invocationCallOrder[0]).toBeLessThan(openPage.mock.invocationCallOrder[0]);
  });

  it("does not refresh when the publish operation is skipped", async () => {
    runOpFn.mockResolvedValueOnce(undefined);
    const { result } = runHook();
    await act(async () => {
      await result.current.onPublishPersonal();
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(onPage).not.toHaveBeenCalled();
    expect(openUrl).not.toHaveBeenCalled();
  });
});
