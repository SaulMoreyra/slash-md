import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "../../../../test/render";
import { mockConflictFile, mockPayload } from "../../__fixtures__/home";
import { NavKind } from "../../enums";
import type { RunOp } from "../../types";
import { useConflicts } from "../useConflicts";

describe("useConflicts", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onOpenPage = vi.fn();
  const onClosePage = vi.fn();
  const onNavigate = vi.fn();
  const getConflictState = vi.fn();
  const syncWithWiki = vi.fn();
  const resolveConflict = vi.fn();
  const abortSyncWithWiki = vi.fn();
  const finishSyncWithWiki = vi.fn();
  const runOp = vi.fn(async <T,>(_op: string, fn: () => Promise<T>) => fn()) as unknown as RunOp;
  let queued: ReturnType<typeof mockConflictFile>[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    queued = [mockConflictFile()];
    getConflictState.mockImplementation(async () => ({ status: "merging", files: queued }));
    resolveConflict.mockImplementation(async () => {
      queued = [];
      return { status: "merging", files: queued };
    });
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: {
        getConflictState,
        syncWithWiki,
        resolveConflict,
        abortSyncWithWiki,
        finishSyncWithWiki,
      },
    });
  });

  const runHook = (wikiSyncStatus: "idle" | "behind" | "conflicting" | "merging" = "merging") =>
    renderHook(
      ({ status }: { status: "idle" | "behind" | "conflicting" | "merging" }) =>
        useConflicts({
          tree: mockPayload({ wikiSyncStatus: status }),
          nav: { view: { kind: NavKind.Drafts }, onNavigate },
          runOp,
          onRefresh,
          onOpenPage,
          onClosePage,
        }),
      { initialProps: { status: wikiSyncStatus } },
    );

  it("opens the conflict pane when wiki sync starts merging", async () => {
    const { result } = runHook("merging");
    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });
    expect(onNavigate).toHaveBeenCalledWith({ kind: NavKind.Conflicts });
    expect(result.current.selectedPath).toBe("docs/a.md");
  });

  it("keeps the publication version through resolveConflict", async () => {
    const { result } = runHook("merging");
    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
      expect(result.current.selectedPath).toBe("docs/a.md");
    });
    await act(async () => {
      await result.current.onKeepMine();
    });
    expect(resolveConflict).toHaveBeenCalledWith("docs/a.md", "ours");
    expect(result.current.files).toHaveLength(0);
    expect(result.current.canFinish).toBe(true);
    expect(result.current.decided).toHaveLength(1);
    expect(result.current.decided[0]?.path).toBe("docs/a.md");
    expect(result.current.decided[0]?.resolvedMarkdown).toBe("# Ours\n");
  });

  it("ignores a stale getConflictState that arrives after sync applies state", async () => {
    let releaseFetch: (state: {
      status: "merging";
      files: ReturnType<typeof mockConflictFile>[];
    }) => void = () => undefined;
    getConflictState.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseFetch = resolve;
        }),
    );
    syncWithWiki.mockResolvedValue({
      status: "merging",
      files: [mockConflictFile({ path: "docs/from-sync.md", title: "From sync" })],
    });

    const { result, rerender } = runHook("conflicting");
    const syncPromise = act(async () => {
      const pending = result.current.onSyncWithWiki();
      rerender({ status: "merging" });
      await pending;
    });
    await syncPromise;

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0]?.path).toBe("docs/from-sync.md");

    await act(async () => {
      releaseFetch({ status: "merging", files: [mockConflictFile()] });
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0]?.path).toBe("docs/from-sync.md");
  });
});
