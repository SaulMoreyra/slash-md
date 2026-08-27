import { Tree, TreeEmpty, TreeSkeleton } from "../../../../../components/Tree";
import type { HomeTreeNode, HomeTreePayload } from "../../../../../../shared/api";

type Props = {
  payload: HomeTreePayload | null;
  roots: HomeTreeNode[];
  selected?: string;
  expanded: Set<string>;
  canWrite?: boolean;
  onFile: (path: string) => void;
  onFolder: (node: HomeTreeNode) => void;
  onToggle: (path: string) => void;
  onRename?: (node: HomeTreeNode) => void;
  onDelete?: (node: HomeTreeNode) => void;
  onNewFileInFolder?: (node: HomeTreeNode) => void;
  onNewFolderInFolder?: (node: HomeTreeNode) => void;
};

export function RailTree({ payload, roots, ...tree }: Props) {
  if (payload?.needsInit) {
    return null;
  }

  return (
    <div className="mt-1 px-1">
      <RailTreeBody payload={payload} roots={roots} {...tree} />
    </div>
  );
}

function RailTreeBody({ payload, roots, ...tree }: Props) {
  if (!payload) {
    return <TreeSkeleton />;
  }

  if (roots.length === 0) {
    return <TreeEmpty />;
  }

  return <Tree nodes={roots} {...tree} />;
}
