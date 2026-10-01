import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DesktopApi, PagePayload } from "../../../../../shared/api";
import { act, renderHook } from "../../../../test/render";
import { AppOperation } from "../../../../App/enums";
import type { RunOp } from "../../../home/types";
import { BodyClass, SaveStatus } from "../../enums";
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

  const runHook = (
    page: PagePayload,
    canWrite = true,
    extras: { active?: boolean; onDirtyChange?: (key: string, dirty: boolean) => void } = {},
  ) =>
    renderHook(
      (props: PagePayload) =>
        useFormatter({
          page: props,
          trail: undefined,
          canWrite,
          onError,
          onPage,
          runOp,
          ...extras,
        }),
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

  it("reports dirty transitions to onDirtyChange", () => {
    const onDirtyChange = vi.fn();
    const { result } = runHook(mockPage(), true, { onDirtyChange });
    expect(onDirtyChange).toHaveBeenLastCalledWith("docs/a.md", false);

    act(() => {
      result.current.onBodyMarkdownChange("body-local");
    });
    expect(onDirtyChange).toHaveBeenLastCalledWith("docs/a.md", true);
  });

  it("captures the editor echo during a streamed write without scheduling a save", () => {
    const { result } = runHook(mockPage());
    const handle = {
      setMarkdown: vi.fn(() => result.current.onBodyMarkdownChange("# streamed")),
      setEditable: vi.fn(),
    };
    (result.current.canvasRef as { current: unknown }).current = handle;

    act(() => {
      result.current.setMarkdown("ignored");
    });

    expect(handle.setMarkdown).toHaveBeenCalledWith("ignored");
    expect(result.current.getMarkdown()).toBe("# streamed");
    expect(result.current.status).not.toBe(SaveStatus.Saving);
  });

  it("toggles editor editability through the canvas handle", () => {
    const { result } = runHook(mockPage());
    const handle = { setMarkdown: vi.fn(), setEditable: vi.fn() };
    (result.current.canvasRef as { current: unknown }).current = handle;

    act(() => {
      result.current.setEditable(false);
    });

    expect(handle.setEditable).toHaveBeenCalledWith(false);
  });

  it("sets body classes only while active", () => {
    const inactive = runHook(mockPage(), true, { active: false });
    expect(document.body.classList.contains(BodyClass.WorkflowWorkspace)).toBe(false);
    inactive.unmount();

    const active = runHook(mockPage(), true, { active: true });
    expect(document.body.classList.contains(BodyClass.WorkflowWorkspace)).toBe(true);
    expect(document.body.classList.contains(BodyClass.PageWiki)).toBe(true);
    expect(document.body.classList.contains(BodyClass.RepoPersonal)).toBe(true);
    active.unmount();
    expect(document.body.classList.contains(BodyClass.WorkflowWorkspace)).toBe(false);
  });
});