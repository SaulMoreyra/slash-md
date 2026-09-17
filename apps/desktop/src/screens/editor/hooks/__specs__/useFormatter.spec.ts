import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DesktopApi, PagePayload } from "../../../../../shared/api";
import { act, renderHook } from "../../../../test/render";
import { AppOperation } from "../../../../App/enums";
import type { RunOp } from "../../../home/types";
import { SaveStatus } from "../../enums";
import { useFormatter } from "../useFormatter";

function mockPage(overrides: Partial<PagePayload> = {}): PagePayload {
  return {
    path: "docs/a.md",
    markdown: "# v1",
    frontmatter: { ...emptyFrontmatter(), title: "A" },
    savedAt: null,
    pageKind: "wiki",
    repoMode: "personal",
    publishEnabled: true,
    reviewable: true,
    prUrl: null,
    ...overrides,
  };
}

describe("useFormatter", () => {
  const onError = vi.fn();
  const onPage = vi.fn();
  const runOp = vi.fn(async <T,>(_op: AppOperation, fn: () => Promise<T>) => fn()) as unknown as RunOp;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: {
        resolveImages: vi.fn(async () => ({})),
        savePage: vi.fn(async () => ({ savedAt: "2026-01-01T00:00:00.000Z" })),
        patchFrontmatter: vi.fn(async () => ({ markdown: "" })),
        uploadImage: vi.fn(async () => ({ src: "x", dataUrl: "" })),
      } as unknown as DesktopApi,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const runHook = (page: PagePayload, canWrite = true) =>
    renderHook(
      (props: PagePayload) =>
        useFormatter({ page: props, trail: undefined, canWrite, onError, onPage, runOp }),
      { initialProps: page },
    );

  it("bumps the reload epoch when the open file changes on disk with a clean buffer", async () => {
    const { result, rerender } = runHook(mockPage());
    expect(result.current.reloadEpoch).toBe(0);

    await act(async () => {
      rerender(mockPage({ markdown: "# v2" }));
    });
    expect(result.current.reloadEpoch).toBe(1);
    expect(result.current.getMarkdown()).toBe("# v2");
  });

  it("keeps a dirty buffer and does not touch the reload epoch", async () => {
    vi.useFakeTimers();
    const { result, rerender } = runHook(mockPage());
    expect(result.current.reloadEpoch).toBe(0);

    act(() => {
      result.current.onBodyMarkdownChange("body-local");
    });
    expect(result.current.status).toBe(SaveStatus.Saving);

    await act(async () => {
      rerender(mockPage({ markdown: "# v2" }));
    });
    expect(result.current.reloadEpoch).toBe(0);
    expect(result.current.getMarkdown()).not.toBe("# v2");
  });

  it("adopts an external change on a read-only page", async () => {
    const { result, rerender } = runHook(mockPage(), false);
    expect(result.current.reloadEpoch).toBe(0);

    await act(async () => {
      rerender(mockPage({ markdown: "# v2" }));
    });
    expect(result.current.reloadEpoch).toBe(1);
    expect(result.current.getMarkdown()).toBe("# v2");
  });

  it("adopts a new file without bumping the epoch (editor remounts on docPath)", async () => {
    const { result, rerender } = runHook(mockPage());

    await act(async () => {
      rerender(mockPage({ path: "docs/b.md", markdown: "# B", frontmatter: { ...emptyFrontmatter(), title: "B" } }));
    });
    expect(result.current.reloadEpoch).toBe(0);
    expect(result.current.getMarkdown()).toBe("# B");
  });
});