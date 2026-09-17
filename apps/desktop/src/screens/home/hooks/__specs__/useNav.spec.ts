import { describe, it, expect, vi, beforeEach } from "vitest";
import { RepoMode } from "@slash-md/core/configTypes";
import { act, renderHook } from "../../../../test/render";
import type { WorkspaceInfo } from "../../../../../shared/api";
import { mockPayload } from "../../__fixtures__/home";
import { NavKind, CreateIntent, RailMode, TreeExpandMode } from "../../enums";
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
  const onClosePage = vi.fn();

  const navProps = {
    onClosePage,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // useNav indexes folders through the host as they are expanded.
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { listFolder: vi.fn(async () => []) },
    });
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
    expect(result.current.workPaneOpen).toBe(false);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Inbox });
    });
    expect(result.current.view.kind).toBe(NavKind.Inbox);
    expect(result.current.isWorkspace).toBe(true);
    expect(result.current.workPaneOpen).toBe(true);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Inbox });
    });
    expect(result.current.workPaneOpen).toBe(true);
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

  it("closes the page when opening a folder", () => {
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
        pagePath: "docs/guide.md",
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    act(() => {
      result.current.onOpenFolder({ kind: "folder", path: "docs", title: "docs" });
    });
    expect(onClosePage).toHaveBeenCalled();
    expect(result.current.view).toEqual({ kind: NavKind.Folder, path: "docs", title: "docs" });
    expect(result.current.section).toBe("docs");
    expect(result.current.workPaneOpen).toBe(false);
  });

  it("reopens the work pane when leaving a folder", () => {
    const { result } = renderHook(() =>
      useNav({
        workspace: mockWorkspace(RepoMode.Workspace),
        tree: mockPayload({
          roots: [{ kind: "folder", path: "docs", title: "docs", children: [] }],
        }),
        pagePath: null,
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    expect(result.current.workPaneOpen).toBe(false);
    act(() => {
      result.current.onOpenFolder({ kind: "folder", path: "docs", title: "docs" });
    });
    expect(result.current.workPaneOpen).toBe(false);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Inbox });
    });
    expect(result.current.workPaneOpen).toBe(true);
    expect(result.current.view.kind).toBe(NavKind.Inbox);
  });

  it("ignores work pane toggle while a folder is selected", () => {
    const { result } = renderHook(() =>
      useNav({
        workspace: mockWorkspace(RepoMode.Local),
        tree: mockPayload({
          roots: [{ kind: "folder", path: "docs", title: "docs", children: [] }],
        }),
        pagePath: null,
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    act(() => {
      result.current.onOpenFolder({ kind: "folder", path: "docs", title: "docs" });
    });
    expect(result.current.workPaneOpen).toBe(false);
    act(() => {
      result.current.onToggleWorkPane();
    });
    expect(result.current.workPaneOpen).toBe(false);
  });

  it("selects the open file in the tree when a page is open inside the folder", () => {
    const { result, rerender } = renderHook(
      ({ pagePath }) =>
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
          pagePath,
          libraryLabel: "Library",
          ...navProps,
        }),
      { initialProps: { pagePath: null as string | null } },
    );
    act(() => {
      result.current.onOpenFolder({ kind: "folder", path: "docs", title: "docs" });
    });
    expect(result.current.treeSelected).toBe("docs");
    rerender({ pagePath: "docs/README.md" });
    expect(result.current.treeSelected).toBe("docs/README.md");
    rerender({ pagePath: "docs/guide.md" });
    expect(result.current.treeSelected).toBe("docs/guide.md");
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
    expect(result.current.workPaneOpen).toBe(false);
    rerender({ tree: mockPayload({ roots: [] }) });
    expect(result.current.view.kind).toBe(NavKind.Drafts);
    expect(result.current.workPaneOpen).toBe(true);
  });

  it("selects the folder when creating a file from tree actions", () => {
    const { result } = renderHook(() =>
      useNav({
        workspace: mockWorkspace(RepoMode.Local),
        tree: mockPayload({
          roots: [{ kind: "folder", path: "docs", title: "docs", children: [] }],
        }),
        pagePath: null,
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    act(() => {
      result.current.onNewFileInFolder({ kind: "folder", path: "docs", title: "docs" });
    });
    expect(result.current.view).toEqual({ kind: NavKind.Folder, path: "docs", title: "docs" });
    expect(result.current.section).toBe("docs");
    expect(result.current.workPaneOpen).toBe(false);
    expect(onClosePage).toHaveBeenCalled();
  });

  it("reopens the work pane when clicking the same dest after collapse", () => {
    const { result } = runHook(RepoMode.Workspace);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Drafts });
    });
    act(() => {
      result.current.onCloseWorkPane();
    });
    expect(result.current.workPaneOpen).toBe(false);
    expect(result.current.view.kind).toBe(NavKind.Drafts);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Drafts });
    });
    expect(result.current.workPaneOpen).toBe(true);
  });

  it("toggles the work pane when the shortcut dest is already open", () => {
    const { result } = runHook(RepoMode.Workspace);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Drafts });
    });
    expect(result.current.workPaneOpen).toBe(true);
    act(() => {
      result.current.onToggleWorkDest({ kind: NavKind.Drafts });
    });
    expect(result.current.workPaneOpen).toBe(false);
    expect(result.current.view.kind).toBe(NavKind.Drafts);
    act(() => {
      result.current.onToggleWorkDest({ kind: NavKind.Drafts });
    });
    expect(result.current.workPaneOpen).toBe(true);
  });

  it("switches dest without closing when the shortcut is a different pane", () => {
    const { result } = runHook(RepoMode.Workspace);
    act(() => {
      result.current.onNavigate({ kind: NavKind.Drafts });
    });
    act(() => {
      result.current.onToggleWorkDest({ kind: NavKind.Inbox });
    });
    expect(result.current.view.kind).toBe(NavKind.Inbox);
    expect(result.current.workPaneOpen).toBe(true);
  });

  it("expands and collapses every nested folder", () => {
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
                {
                  kind: "folder",
                  path: "docs/guides",
                  title: "guides",
                  children: [{ kind: "file", path: "docs/guides/intro.md", title: "Intro" }],
                },
              ],
            },
          ],
        }),
        pagePath: null,
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    expect(result.current.canToggleAllFolders).toBe(true);
    expect(result.current.treeExpandMode).toBe(TreeExpandMode.Expand);
    expect(result.current.expanded.size).toBe(0);
    act(() => {
      result.current.onToggleAllFolders();
    });
    expect([...result.current.expanded]).toEqual(["docs", "docs/guides"]);
    expect(result.current.treeExpandMode).toBe(TreeExpandMode.Collapse);
    act(() => {
      result.current.onToggleAllFolders();
    });
    expect(result.current.expanded.size).toBe(0);
    expect(result.current.treeExpandMode).toBe(TreeExpandMode.Expand);
  });

  it("hides expand-all while the workspace needs init", () => {
    const { result } = renderHook(() =>
      useNav({
        workspace: mockWorkspace(RepoMode.Local),
        tree: mockPayload({
          needsInit: true,
          roots: [{ kind: "folder", path: "docs", title: "docs", children: [{ kind: "file", path: "docs/a.md", title: "A" }] }],
        }),
        pagePath: null,
        libraryLabel: "Library",
        ...navProps,
      }),
    );
    expect(result.current.canToggleAllFolders).toBe(false);
  });
});
