import type { HomeTreeNode } from "../../shared/api";
import { IconChevron, IconFolder, IconPage } from "./icons";

type Props = {
  nodes: HomeTreeNode[];
  selected?: string;
  expanded: Set<string>;
  depth?: number;
  onFile: (path: string) => void;
  onFolder: (node: HomeTreeNode) => void;
  onToggle: (path: string) => void;
};

export function Tree({ nodes, selected, expanded, depth = 0, onFile, onFolder, onToggle }: Props) {
  return (
    <ul className={depth > 0 ? "tree is-nested" : "tree"}>
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selected={selected}
          expanded={expanded}
          depth={depth}
          onFile={onFile}
          onFolder={onFolder}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

function TreeNode({
  node,
  selected,
  expanded,
  depth,
  onFile,
  onFolder,
  onToggle,
}: {
  node: HomeTreeNode;
  selected?: string;
  expanded: Set<string>;
  depth: number;
  onFile: (path: string) => void;
  onFolder: (node: HomeTreeNode) => void;
  onToggle: (path: string) => void;
}) {
  if (node.kind === "file") {
    const active = selected === node.path;
    return (
      <li>
        <div className={active ? "tree-row is-selected" : "tree-row"}>
          <span className="tree-twist" aria-hidden="true" />
          <button
            type="button"
            className="tree-file"
            aria-current={active ? "page" : undefined}
            onClick={() => onFile(node.path)}
          >
            <span className="tree-glyph">
              <IconPage />
            </span>
            <span className="tree-label">{node.title}</span>
          </button>
        </div>
      </li>
    );
  }

  const children = node.children ?? [];
  const open = expanded.has(node.path);
  const active = selected === node.path;
  return (
    <li>
      <div className={active ? "tree-row is-selected" : "tree-row"}>
        {children.length > 0 ? (
          <button
            type="button"
            className={open ? "tree-twist is-open" : "tree-twist"}
            aria-expanded={open}
            aria-label={open ? `Colapsar ${node.title}` : `Expandir ${node.title}`}
            onClick={(ev) => {
              ev.stopPropagation();
              onToggle(node.path);
            }}
          >
            <IconChevron />
          </button>
        ) : (
          <span className="tree-twist" aria-hidden="true" />
        )}
        <button
          type="button"
          className="tree-folder"
          aria-current={active ? "true" : undefined}
          onClick={() => onFolder(node)}
        >
          <span className="tree-glyph">
            <IconFolder />
          </span>
          <span className="tree-label">{node.title}</span>
        </button>
      </div>
      {open && children.length > 0 ? (
        <Tree
          nodes={children}
          selected={selected}
          expanded={expanded}
          depth={depth + 1}
          onFile={onFile}
          onFolder={onFolder}
          onToggle={onToggle}
        />
      ) : null}
    </li>
  );
}
