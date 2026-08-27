import type { HomeTreeNode } from "@slash-md/core/homeTypes";
import type { IndexEntry } from "../types";

export function filterTreeNodes(nodes: HomeTreeNode[], query: string): HomeTreeNode[] {
  if (!query) {
    return nodes;
  }
  const out: HomeTreeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "file") {
      if (node.title.toLowerCase().includes(query) || node.path.toLowerCase().includes(query)) {
        out.push(node);
      }
    } else {
      const filteredChildren = filterTreeNodes(node.children ?? [], query);
      const folderMatches = node.title.toLowerCase().includes(query) || node.path.toLowerCase().includes(query);
      if (filteredChildren.length > 0 || folderMatches) {
        out.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children });
      }
    }
  }
  return out;
}

export function findFile(nodes: HomeTreeNode[], path: string): HomeTreeNode | undefined {
  for (const node of nodes) {
    if (node.kind === "file" && node.path === path) {
      return node;
    }
    if (node.kind === "folder" && node.children) {
      const hit = findFile(node.children, path);
      if (hit) {
        return hit;
      }
    }
  }
  return undefined;
}

export function findFolder(nodes: HomeTreeNode[], path: string): HomeTreeNode | undefined {
  for (const node of nodes) {
    if (node.kind === "folder" && node.path === path) {
      return node;
    }
    if (node.kind === "folder" && node.children) {
      const hit = findFolder(node.children, path);
      if (hit) {
        return hit;
      }
    }
  }
  return undefined;
}

export function collectIndex(nodes: HomeTreeNode[], group = "Pages", groupPath = ""): IndexEntry[] {
  const out: IndexEntry[] = [];
  for (const node of nodes) {
    if (node.kind === "file") {
      out.push({ file: node, group, groupPath });
    } else {
      out.push(...collectIndex(node.children ?? [], node.title, node.path));
    }
  }
  return out;
}

export function parentSection(remotePath: string): string | undefined {
  const parts = remotePath.split("/");
  if (parts.length <= 2) {
    return undefined;
  }
  return parts.slice(0, -1).join("/");
}

export type LibraryHit = {
  kind: "file" | "folder";
  path: string;
  title: string;
  trail: string;
};

export function flattenLibrary(nodes: HomeTreeNode[], trail: string[] = []): LibraryHit[] {
  const out: LibraryHit[] = [];
  for (const node of nodes) {
    out.push({
      kind: node.kind,
      path: node.path,
      title: node.title,
      trail: trail.join(" / "),
    });
    if (node.kind === "folder") {
      out.push(...flattenLibrary(node.children ?? [], [...trail, node.title]));
    }
  }
  return out;
}

export function rankLibraryHits(hits: LibraryHit[], query: string): LibraryHit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  return hits
    .map((hit) => ({ hit, score: scoreHit(hit, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title, "es"))
    .map((row) => row.hit);
}

function scoreHit(hit: LibraryHit, q: string): number {
  const title = hit.title.toLowerCase();
  const path = hit.path.toLowerCase();
  const trail = hit.trail.toLowerCase();
  if (title === q) {
    return hit.kind === "file" ? 100 : 90;
  }
  if (title.startsWith(q)) {
    return hit.kind === "file" ? 80 : 70;
  }
  if (title.includes(q)) {
    return 50;
  }
  if (path.includes(q)) {
    return 20;
  }
  if (trail.includes(q)) {
    return 10;
  }
  return 0;
}

/** Folder paths that actually nest children (can expand in the tree). */
export function expandableFolderPaths(nodes: HomeTreeNode[]): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if (node.kind !== "folder") {
      continue;
    }
    const children = node.children ?? [];
    if (children.length === 0) {
      continue;
    }
    out.push(node.path);
    out.push(...expandableFolderPaths(children));
  }
  return out;
}

/** Folder paths to expand so `path` is visible in a collapsed tree. */
export function revealTrail(path: string, kind: "file" | "folder"): string[] {
  const parts = path.split("/").filter(Boolean);
  const dirs = kind === "file" ? parts.slice(0, -1) : parts;
  const out: string[] = [];
  for (let i = 1; i <= dirs.length; i++) {
    out.push(dirs.slice(0, i).join("/"));
  }
  return out;
}
