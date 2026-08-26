import { useEffect, useMemo, useState } from "react";
import { posixBasename, rewritePosixPrefix, isPosixUnder } from "@slash-md/core/paths";
import { findFolder, flattenLibrary, revealTrail } from "@slash-md/ui/home/utils/tree";
import type { HomeTreeNode, HomeTreePayload, WorkspaceInfo } from "../../../../shared/api";
import { isWorkspaceOnlyNav, NavKind, RAIL_OVERLAY_MAX_WIDTH, RailMode, RepoMode, TreeEntryKind } from "../enums";
import type { NavView } from "../types";
import { createIntentForSection, findFolderCover, workspaceTitle } from "../utils";
import { useRailMode } from "./useRailMode";

type Params = {
  workspace: WorkspaceInfo;
  tree: HomeTreePayload | null;
  pagePath: string | null;
  libraryLabel: string;
  onOpenPage: (path: string) => void;
  onClosePage: () => void;
};

export type NavApi = ReturnType<typeof useNav>;

export function useNav({ workspace, tree, pagePath, libraryLabel, onOpenPage, onClosePage }: Params) {
  const [view, setViewState] = useState<NavView>({ kind: NavKind.Drafts });
  const [workPaneOpen, setWorkPaneOpen] = useState(true);
  const [railOpen, setRailOpen] = useState(
    () => !window.matchMedia(`(max-width: ${RAIL_OVERLAY_MAX_WIDTH - 1}px)`).matches,
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const railMode = useRailMode();

  const payload = tree;
  const isWorkspace = workspace.config?.mode === RepoMode.Workspace;
  const personal = !isWorkspace;
  const roots = payload?.roots ?? [];
  const folder = view.kind === NavKind.Folder && payload ? findFolder(payload.roots, view.path) : undefined;
  const cover = folder ? findFolderCover(folder) : undefined;
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
  const treeSelected = treeSelection(view, cover, pagePath);

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

  function onCloseWorkPane() {
    setWorkPaneOpen(false);
  }

  function onOpenWorkPane() {
    setWorkPaneOpen(true);
  }

  function onToggleWorkPane() {
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

  function onOpenFolder(node: HomeTreeNode) {
    const full = findFolder(roots, node.path) ?? node;
    onReveal(full.path, TreeEntryKind.Folder);
    onNavigate({ kind: NavKind.Folder, path: full.path, title: full.title });
    const nextCover = findFolderCover(full);
    if (nextCover) {
      onOpenPage(nextCover.path);
    } else {
      onClosePage();
    }
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
    }
  }, [isWorkspace, view.kind]);

  useEffect(() => {
    if (view.kind !== NavKind.Folder || !payload || payload.needsInit) {
      return;
    }
    if (!findFolder(payload.roots, view.path)) {
      setViewState({ kind: NavKind.Drafts });
    }
  }, [payload, view]);

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
    cover,
    section,
    createIntent,
    trails,
    title,
    treeSelected,
    onNavigate,
    onCloseWorkPane,
    onOpenWorkPane,
    onToggleWorkPane,
    onCloseRail,
    onOpenRail,
    onToggleRail,
    onDismissOverlay,
    onReveal,
    onToggleFolder,
    onOpenFolder,
    onRewritePath,
  };
}

function treeSelection(
  view: NavView,
  cover: HomeTreeNode | undefined,
  pagePath: string | null,
): string | undefined {
  if (view.kind !== NavKind.Folder) {
    return pagePath ?? undefined;
  }
  if (cover && pagePath === cover.path) {
    return view.path;
  }
  return pagePath ?? view.path;
}
