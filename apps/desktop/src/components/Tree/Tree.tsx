import type { HomeTreeNode } from "../../../shared/api";
import { TreeNode } from "./components/TreeNode";

export type TreeProps = {
  nodes: HomeTreeNode[];
  selected?: string;
  expanded: Set<string>;
  depth?: number;
  canWrite?: boolean;
  onFile: (path: string) => void;
  onFolder: (node: HomeTreeNode) => void;
  onToggle: (path: string) => void;
  onRename?: (node: HomeTreeNode) => void;
  onDelete?: (node: HomeTreeNode) => void;
};

export function Tree({
  nodes,
  selected,
  expanded,
  depth = 0,
  canWrite,
  onFile,
  onFolder,
  onToggle,
  onRename,
  onDelete,
}: TreeProps) {
  return (
    <ul className={depth > 0 ? "flex flex-col gap-0.5 pl-5" : "flex flex-col gap-0.5"}>
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selected={selected}
          expanded={expanded}
          depth={depth}
          canWrite={canWrite}
          onFile={onFile}
          onFolder={onFolder}
          onToggle={onToggle}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
