import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "../../../../test/render";
import type { HomeTreeNode } from "../../../../../shared/api";
import { TreePathState, useFolderIndex } from "../useFolderIndex";

function folder(path: string): HomeTreeNode {
  return { kind: "folder", path, title: path.split("/").pop()! };
}

function file(path: string): HomeTreeNode {
  return { kind: "file", path, title: path.split("/").pop()! };
}

describe("useFolderIndex", () => {
  let listFolder: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listFolder = vi.fn(async () => [] as HomeTreeNode[]);
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { listFolder },
    });
  });

  it("does not index anything until a folder is expanded", () => {
    renderHook(() => useFolderIndex({ roots: [folder("docs")], expanded: new Set() }));
    expect(listFolder).not.toHaveBeenCalled();
  });

  it("indexes only the folder that was expanded", async () => {
    listFolder.mockResolvedValue([file("docs/a.md")]);
    const { result } = renderHook(
      ({ expanded }: { expanded: Set<string> }) =>
        useFolderIndex({ roots: [folder("docs"), folder("specs")], expanded }),
      { initialProps: { expanded: new Set(["docs"]) } },
    );

    await waitFor(() => {
      expect(result.current.tree[0]?.children).toEqual([file("docs/a.md")]);
    });
    expect(listFolder).toHaveBeenCalledTimes(1);
    expect(listFolder).toHaveBeenCalledWith("docs");
    // The sibling was never opened, so it must still be uncharted.
    expect(result.current.tree[1]?.children).toBeUndefined();
  });

  it("grafts a nested level under its parent", async () => {
    listFolder.mockImplementation(async (path: string) =>
      path === "docs" ? [folder("docs/api")] : [file("docs/api/rest.md")],
    );
    const { result } = renderHook(
      ({ expanded }: { expanded: Set<string> }) =>
        useFolderIndex({ roots: [folder("docs")], expanded }),
      { initialProps: { expanded: new Set(["docs", "docs/api"]) } },
    );

    await waitFor(() => {
      expect(result.current.tree[0]?.children?.[0]?.children).toEqual([file("docs/api/rest.md")]);
    });
  });

  it("asks for a folder once, however often it re-renders", async () => {
    const expanded = new Set(["docs"]);
    const { result, rerender } = renderHook(
      ({ roots }: { roots: HomeTreeNode[] }) => useFolderIndex({ roots, expanded }),
      { initialProps: { roots: [folder("docs")] } },
    );

    await waitFor(() => expect(listFolder).toHaveBeenCalledTimes(1));
    // A caller that builds its tree during render hands us a new array every
    // time. That must not re-index, and must not loop.
    for (let i = 0; i < 5; i += 1) {
      rerender({ roots: [folder("docs")] });
    }
    await act(async () => {});
    expect(listFolder).toHaveBeenCalledTimes(1);
    expect(result.current.tree).toHaveLength(1);
  });

  it("re-indexes when the top level actually changes", async () => {
    const expanded = new Set(["docs"]);
    const { rerender } = renderHook(
      ({ roots }: { roots: HomeTreeNode[] }) => useFolderIndex({ roots, expanded }),
      { initialProps: { roots: [folder("docs")] } },
    );

    await waitFor(() => expect(listFolder).toHaveBeenCalledTimes(1));
    rerender({ roots: [folder("docs"), folder("specs")] });
    await waitFor(() => expect(listFolder).toHaveBeenCalledTimes(2));
  });

  describe("stateOf", () => {
    it("reports a top-level folder as found", () => {
      const { result } = renderHook(() =>
        useFolderIndex({ roots: [folder("docs")], expanded: new Set() }),
      );
      expect(result.current.stateOf("docs")).toBe(TreePathState.Found);
    });

    it("reports an unrelated path as absent", () => {
      const { result } = renderHook(() =>
        useFolderIndex({ roots: [folder("docs")], expanded: new Set() }),
      );
      expect(result.current.stateOf("gone")).toBe(TreePathState.Absent);
    });

    it("reports a path under an unindexed folder as unknown, not absent", () => {
      const { result } = renderHook(() =>
        useFolderIndex({ roots: [folder("docs")], expanded: new Set() }),
      );
      // docs/api may well exist; nobody has opened docs yet to find out.
      expect(result.current.stateOf("docs/api")).toBe(TreePathState.Unknown);
    });

    it("reports a path as absent once its parent is indexed without it", async () => {
      listFolder.mockResolvedValue([folder("docs/api")]);
      const { result } = renderHook(() =>
        useFolderIndex({ roots: [folder("docs")], expanded: new Set(["docs"]) }),
      );

      await waitFor(() => {
        expect(result.current.stateOf("docs/api")).toBe(TreePathState.Found);
      });
      expect(result.current.stateOf("docs/ghost")).toBe(TreePathState.Absent);
    });
  });
});
