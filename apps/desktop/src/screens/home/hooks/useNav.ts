import { useEffect, useMemo, useState } from "react";
import { posixBasename, rewritePosixPrefix, isPosixUnder } from "@slash-md/core/paths";
import { expandableFolderPaths, findFolder, flattenLibrary, revealTrail } from "@slash-md/ui/home/utils/tree";
import type { HomeTreeNode, HomeTreePayload, WorkspaceInfo } from "../../../../shared/api";
import { isWorkspaceOnlyNav, NavKind, RAIL_OVERLAY_MAX_WIDTH, RailMode, RepoMode, TreeEntryKind, TreeExpandMode } from "../enums";
import type { NavView } from "../types";
import { createIntentForSection, workspaceTitle } from "../utils";
import { TreePathState, useFolderIndex } from "./useFolderIndex";
import { useRailMode } from "./useRailMode";

type Params = {
  workspace: WorkspaceInfo;
  tree: HomeTreePayload | null;
  pagePath: string | null;
  libraryLabel: string;
  onClosePage: () => void;
};

/** Shared empty tree so an uninitialised workspace does not churn identities. */
const EMPTY_ROOTS: HomeTreeNode[] = [];

export type NavApi = ReturnType<typeof useNav>;

export function useNav({ workspace, tree, pagePath, libraryLabel, onClosePage }: Params) {
  const [view, setViewState] = useState<NavView>({ kind: NavKind.Drafts });
  const [workPaneOpen, setWorkPaneOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(
    () => !window.matchMedia(`(max-width: ${RAIL_OVERLAY_MAX_WIDTH - 1}px)`).matches,
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const railMode = useRailMode();

  const payload = tree;
  const isWorkspace = workspace.config?.mode === RepoMode.Workspace;
  const personal = !isWorkspace;
  // The snapshot carries only the top level; deeper folders are indexed as they
  // are opened, so `roots` here is the grafted tree, not `payload.roots`.
  const { tree: roots, stateOf } = useFolderIndex({
    roots: payload?.roots ?? EMPTY_ROOTS,
    expanded,
  });
  const folder = view.kind === NavKind.Folder ? findFolder(roots, view.path) : undefined;
  const section = view.kind === NavKind.Folder ? view.path : undefined;
  const createIntent = createIntentForSection(
    section,
    workspace.config?.contentPath,
    workspace.slashmd.templatesPath,
  );
  const trails = useMemo(() => {
    const map = new Map<string, string>();
    for (const hit of flattenLibrary(roots)) {
      map.set(hit.path, hit.trail);
    }
    return map;
  }, [roots]);
  const title = workspaceTitle(payload, workspace.root, libraryLabel);
  const treeSelected = treeSelection(view, pagePath);
  const expandableFolders = useMemo(() => expandableFolderPaths(roots), [roots]);
  const canToggleAllFolders = !payload?.needsInit && expandableFolders.length > 0;
  const allFoldersExpanded =
    expandableFolders.length > 0 && expandableFolders.every((path) => expanded.has(path));
  const treeExpandMode = allFoldersExpanded ? TreeExpandMode.Collapse : TreeExpandMode.Expand;

  function onNavigate(next: NavView) {
    if (!isWorkspace && isWorkspaceOnlyNav(next.kind)) {
      return;
    }
    setViewState(next);
    setWorkPaneOpen(true);
    if (railMode === RailMode.Overlay && next.kind !== NavKind.Folder) {
      setRailOpen(false);
    }
  }

  function onToggleWorkDest(next: NavView) {
    if (!isWorkspace && isWorkspaceOnlyNav(next.kind)) {
      return;
    }
    if (workPaneOpen && view.kind === next.kind) {
      setWorkPaneOpen(false);
      return;
    }
    onNavigate(next);
  }

  function onCloseWorkPane() {
    setWorkPaneOpen(false);
  }

  function onOpenWorkPane() {
    if (view.kind === NavKind.Folder) {
      return;
    }
    setWorkPaneOpen(true);
  }

  function onToggleWorkPane() {
    if (view.kind === NavKind.Folder) {
      return;
    }
    if (workPaneOpen) {
      onCloseWorkPane();
    } else {
      onOpenWorkPane();
    }
  }

  function onCloseRail() {
    setRailOpen(false);
  }

  function onOpenRail() {
    setRailOpen(true);
  }

  function onToggleRail() {
    if (railOpen) {
      onCloseRail();
    } else {
      onOpenRail();
    }
  }

  function onDismissOverlay() {
    if (railMode === RailMode.Overlay) {
      setRailOpen(false);
    }
  }

  function onReveal(path: string, kind: TreeEntryKind) {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const item of revealTrail(path, kind)) {
        next.add(item);
      }
      return next;
    });
  }

  function onToggleFolder(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function onToggleAllFolders() {
    setExpanded((prev) => {
      if (expandableFolders.length > 0 && expandableFolders.every((path) => prev.has(path))) {
        return new Set();
      }
      return new Set(expandableFolders);
    });
  }

  function onOpenFolder(node: HomeTreeNode) {
    const full = findFolder(roots, node.path) ?? node;
    onReveal(full.path, TreeEntryKind.Folder);
    onNavigate({ kind: NavKind.Folder, path: full.path, title: full.title });
    setWorkPaneOpen(false);
    onClosePage();
  }

  function onNewFileInFolder(node: HomeTreeNode) {
    onOpenFolder(node);
  }

  function onRewritePath(from: string, to: string) {
    setExpanded((prev) => {
      const next = new Set<string>();
      for (const path of prev) {
        next.add(isPosixUnder(path, from) ? rewritePosixPrefix(path, from, to) : path);
      }
      return next;
    });
    setViewState((prev) => {
      if (prev.kind !== NavKind.Folder || !isPosixUnder(prev.path, from)) {
        return prev;
      }
      const path = rewritePosixPrefix(prev.path, from, to);
      return { kind: NavKind.Folder, path, title: posixBasename(path) || prev.title };
    });
  }

  useEffect(() => {
    if (!isWorkspace && isWorkspaceOnlyNav(view.kind)) {
      setViewState({ kind: NavKind.Drafts });
      setWorkPaneOpen(true);
    }
  }, [isWorkspace, view.kind]);

  useEffect(() => {
    if (view.kind !== NavKind.Folder || !payload || payload.needsInit) {
      return;
    }
    // Only leave when the folder is definitively gone. A folder deeper than the
    // indexed levels is merely unknown yet, and bouncing to Drafts on that would
    // fight the user every time they opened something below the first level.
    if (stateOf(view.path) === TreePathState.Absent) {
      setViewState({ kind: NavKind.Drafts });
      setWorkPaneOpen(true);
    }
  }, [payload, view, stateOf]);

  useEffect(() => {
    setRailOpen(railMode !== RailMode.Overlay);
  }, [railMode]);

  return {
    view,
    workPaneOpen,
    railOpen,
    railMode,
    expanded,
    payload,
    isWorkspace,
    personal,
    roots,
    folder,
    section,
    createIntent,
    trails,
    title,
    treeSelected,
    canToggleAllFolders,
    treeExpandMode,
    onNavigate,
    onToggleWorkDest,
    onCloseWorkPane,
    onOpenWorkPane,
    onToggleWorkPane,
    onCloseRail,
    onOpenRail,
    onToggleRail,
    onDismissOverlay,
    onReveal,
    onToggleFolder,
    onToggleAllFolders,
    onOpenFolder,
    onNewFileInFolder,
    onRewritePath,
  };
}

function treeSelection(view: NavView, pagePath: string | null): string | undefined {
  if (view.kind !== NavKind.Folder) {
    return pagePath ?? undefined;
  }
  return pagePath ?? view.path;
}
