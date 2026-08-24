import type { HomeTreeNode } from "../../src/home/homeTree";
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
