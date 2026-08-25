import type { HomeTreeNode, HomeTreePayload } from "@slash-md/core/homeTypes";
import type { HomeContext } from "./context";
import { findFile, findFolder, parentSection } from "./utils/tree";

export function refreshSelectionFromPayload(ctx: HomeContext, payload: HomeTreePayload): void {
  const { selection } = ctx.state;
  if (selection.kind === "file") {
    const found = findFile(payload.roots, selection.path);
    ctx.state.selection = found
      ? { kind: "file", path: found.path, title: found.title, badge: found.badge }
      : { kind: "none" };
    return;
  }
  if (selection.kind === "folder") {
    const found = findFolder(payload.roots, selection.path);
    ctx.state.selection = found
      ? {
          kind: "folder",
          path: found.path,
          title: found.title,
          children: found.children ?? [],
        }
      : { kind: "none" };
  }
}

export function clearSelection(ctx: HomeContext): void {
  ctx.state.selectedSection = undefined;
  ctx.state.selection = { kind: "none" };
  ctx.refresh();
}

export function selectFolder(ctx: HomeContext, node: HomeTreeNode): void {
  ctx.state.selectedSection = node.path;
  ctx.state.selection = {
    kind: "folder",
    path: node.path,
    title: node.title,
    children: node.children ?? [],
  };
  ctx.refresh();
}

export function selectFile(ctx: HomeContext, node: HomeTreeNode): void {
  ctx.state.selection = {
    kind: "file",
    path: node.path,
    title: node.title,
    badge: node.badge,
  };
  ctx.state.selectedSection = parentSection(node.path);
  ctx.refresh();
}

export function toggleDraftLocal(ctx: HomeContext, path: string): void {
  if (!ctx.state.lastPayload) {
    return;
  }
  const selected = new Set(ctx.state.lastPayload.selected ?? []);
  if (selected.has(path)) {
    selected.delete(path);
  } else {
    selected.add(path);
  }
  setDraftSelectionLocal(ctx, [...selected]);
}

export function setDraftSelectionLocal(ctx: HomeContext, paths: string[]): void {
  if (!ctx.state.lastPayload) {
    return;
  }
  ctx.state.lastPayload = { ...ctx.state.lastPayload, selected: paths };
  ctx.refreshStage();
}
