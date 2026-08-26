import { Button } from "@heroui/react";
import type { HomeTreeNode } from "../../../../shared/api";
import { IconFolder, IconPage } from "../../icons";
import { Tree } from "../Tree";
import { TreeNodeMenu } from "./TreeNodeMenu";

export type TreeNodeProps = {
  node: HomeTreeNode;
  selected?: string;
  expanded: Set<string>;
  depth: number;
  canWrite?: boolean;
  onFile: (path: string) => void;
  onFolder: (node: HomeTreeNode) => void;
  onToggle: (path: string) => void;
  onRename?: (node: HomeTreeNode) => void;
  onDelete?: (node: HomeTreeNode) => void;
};

export function TreeNode({
  node,
  selected,
  expanded,
  depth,
  canWrite,
  onFile,
  onFolder,
  onToggle,
  onRename,
  onDelete,
}: TreeNodeProps) {
  const active = selected === node.path;
  const menu =
    canWrite && onRename && onDelete ? (
      <TreeNodeMenu node={node} onRename={onRename} onDelete={onDelete} />
    ) : null;

  if (node.kind === "file") {
    return (
      <li>
        <div className="group/row flex min-w-0 items-center gap-0.5">
          <Button
            variant={active ? "secondary" : "ghost"}
            size="sm"
            className="min-w-0 flex-1 justify-start gap-2"
            aria-current={active ? "page" : undefined}
            onPress={() => onFile(node.path)}
          >
            <IconPage />
            <span className="truncate">{node.title}</span>
          </Button>
          {menu}
        </div>
      </li>
    );
  }

  const children = node.children ?? [];
  const open = expanded.has(node.path);

  function onPressFolder() {
    if (open && selected === node.path) {
      onToggle(node.path);
      return;
    }
    onFolder(node);
  }

  return (
    <li className="flex flex-col gap-0.5">
      <div className="group/row flex min-w-0 items-center gap-0.5">
        <Button
          variant={active ? "secondary" : "ghost"}
          size="sm"
          className="min-w-0 flex-1 justify-start gap-2"
          aria-current={active ? "true" : undefined}
          aria-expanded={children.length > 0 ? open : undefined}
          onPress={onPressFolder}
        >
          <IconFolder />
          <span className="truncate">{node.title}</span>
        </Button>
        {menu}
      </div>
      {open && children.length > 0 ? (
        <div className="animate-fade-in motion-reduce:animate-none">
          <Tree
            nodes={children}
            selected={selected}
            expanded={expanded}
            depth={depth + 1}
            canWrite={canWrite}
            onFile={onFile}
            onFolder={onFolder}
            onToggle={onToggle}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      ) : null}
    </li>
  );
}
