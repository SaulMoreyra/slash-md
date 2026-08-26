import { describe, it, expect, vi, beforeEach } from "vitest";
import { RepoMode } from "@slash-md/core/configTypes";
import { act, renderHook } from "../../../../test/render";
import type { WorkspaceInfo } from "../../../../../shared/api";
import { mockPayload } from "../../__fixtures__/home";
import { NavKind, CreateIntent, RailMode } from "../../enums";
import { useNav } from "../useNav";

function mockWorkspace(mode: RepoMode): WorkspaceInfo {
  return {
    root: "/tmp/wiki",
    config: {
      repo: "acme/docs",
      owner: "acme",
      name: "docs",
      contentPath: "docs",
      defaultBranch: "main",
      mode,
    },
    slashmd: { mode },
    needsInit: false,
    auth: null,
    theme: "dark",
  };
}

describe("useNav", () => {
  const onOpenPage = vi.fn();
  const onClosePage = vi.fn();

  const navProps = {
    onOpenPage,
    onClosePage,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  const runHook = (mode: RepoMode) =>
    renderHook(() =>
      useNav({
        workspace: mockWorkspace(mode),
        tree: mockPayload(),
        pagePath: null,
        libraryLabel: "Library",
        ...navProps,
      }),
    );

  it("opens inbox in workspace mode", () => {
    const { result } = runHook(RepoMode.Workspace);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Inbox });
    });
    expect(result.current.view.kind).toBe(NavKind.Inbox);
    expect(result.current.isWorkspace).toBe(true);
  });

  it("rejects inbox navigation in local mode", () => {
    const { result } = runHook(RepoMode.Local);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Inbox });
    });
    expect(result.current.view.kind).toBe(NavKind.Drafts);
    expect(result.current.isWorkspace).toBe(false);
  });

  it("rejects inbox navigation in personal mode", () => {
    const { result } = runHook(RepoMode.Personal);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Inbox });
    });
    expect(result.current.view.kind).toBe(NavKind.Drafts);
  });

  it("rejects conflicts navigation in personal mode", () => {
    const { result } = runHook(RepoMode.Personal);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Conflicts });
    });
    expect(result.current.view.kind).toBe(NavKind.Drafts);
  });

  it("uses template create intent inside the templates folder", () => {
    const { result } = renderHook(() =>
      useNav({
        workspace: {
          ...mockWorkspace(RepoMode.Local),
          config: {
            ...mockWorkspace(RepoMode.Local).config!,
            contentPath: ".",
          },
        },
        tree: mockPayload({
          contentPath: ".",
          roots: [{ kind: "folder", path: "templates", title: "templates", children: [] }],
        }),
        pagePath: null,
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    act(() => {
      result.current.onOpenFolder({ kind: "folder", path: "templates", title: "templates", children: [] });
    });
    expect(result.current.createIntent).toBe(CreateIntent.Template);
    expect(result.current.section).toBe("templates");
  });

  it("opens the folder README when present", () => {
    const { result } = renderHook(() =>
      useNav({
        workspace: mockWorkspace(RepoMode.Local),
        tree: mockPayload({
          roots: [
            {
              kind: "folder",
              path: "docs",
              title: "docs",
              children: [
                { kind: "file", path: "docs/README.md", title: "Docs" },
                { kind: "file", path: "docs/guide.md", title: "Guide" },
              ],
            },
          ],
        }),
        pagePath: null,
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    act(() => {
      result.current.onOpenFolder({ kind: "folder", path: "docs", title: "docs" });
    });
    expect(onOpenPage).toHaveBeenCalledWith("docs/README.md");
    expect(onClosePage).not.toHaveBeenCalled();
    expect(result.current.view).toEqual({ kind: NavKind.Folder, path: "docs", title: "docs" });
  });

  it("highlights the folder while its cover is open", () => {
    const { result } = renderHook(() =>
      useNav({
        workspace: mockWorkspace(RepoMode.Local),
        tree: mockPayload({
          roots: [
            {
              kind: "folder",
              path: "docs",
              title: "docs",
              children: [{ kind: "file", path: "docs/README.md", title: "Docs" }],
            },
          ],
        }),
        pagePath: "docs/README.md",
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    act(() => {
      result.current.onOpenFolder({ kind: "folder", path: "docs", title: "docs" });
    });
    expect(result.current.treeSelected).toBe("docs");
  });

  it("toggles the library rail", () => {
    const { result } = runHook(RepoMode.Local);
    expect(result.current.railOpen).toBe(true);
    act(() => {
      result.current.onToggleRail();
    });
    expect(result.current.railOpen).toBe(false);
    act(() => {
      result.current.onToggleRail();
    });
    expect(result.current.railOpen).toBe(true);
  });

  it("closes the overlay rail after opening a work destination", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const { result } = runHook(RepoMode.Local);
    expect(result.current.railMode).toBe(RailMode.Overlay);
    act(() => {
      result.current.onOpenRail();
    });
    expect(result.current.railOpen).toBe(true);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Drafts });
    });
    expect(result.current.railOpen).toBe(false);
  });

  it("closes the page when the folder has no cover", () => {
    const { result } = renderHook(() =>
      useNav({
        workspace: mockWorkspace(RepoMode.Local),
        tree: mockPayload({
          roots: [
            {
              kind: "folder",
              path: "docs",
              title: "docs",
              children: [{ kind: "file", path: "docs/guide.md", title: "Guide" }],
            },
          ],
        }),
        pagePath: "docs/guide.md",
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    act(() => {
      result.current.onOpenFolder({ kind: "folder", path: "docs", title: "docs" });
    });
    expect(onClosePage).toHaveBeenCalled();
    expect(onOpenPage).not.toHaveBeenCalled();
  });

  it("falls back to drafts when the open folder is gone", () => {
    const { result, rerender } = renderHook(
      ({ tree }) =>
        useNav({
          workspace: mockWorkspace(RepoMode.Workspace),
          tree,
          pagePath: null,
          libraryLabel: "Workspace",
          ...navProps,
        }),
      {
        initialProps: {
          tree: mockPayload({
            roots: [{ kind: "folder" as const, path: "docs", title: "docs", children: [] }],
          }),
        },
      },
    );
    act(() => {
      result.current.onOpenFolder({ kind: "folder", path: "docs", title: "docs" });
    });
    expect(result.current.view.kind).toBe(NavKind.Folder);
    rerender({ tree: mockPayload({ roots: [] }) });
    expect(result.current.view.kind).toBe(NavKind.Drafts);
  });
});
