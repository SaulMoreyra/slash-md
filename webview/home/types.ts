import type { HomeTreeNode } from "../../src/home/homeTree";

export type Selection =
  | { kind: "none" }
  | { kind: "folder"; path: string; title: string; children: HomeTreeNode[] }
  | { kind: "file"; path: string; title: string; badge?: string }
  | { kind: "config" };

export type IndexEntry = {
  file: HomeTreeNode;
  group: string;
  groupPath: string;
};
