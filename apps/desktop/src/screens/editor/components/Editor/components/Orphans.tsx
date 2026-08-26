import { OrphanThreadRail } from "../../OrphanThreadRail";
import { useEditor } from "../context";

export function Orphans() {
  const { threads } = useEditor();
  if (threads.orphans.length === 0) return null;
  return <OrphanThreadRail orphans={threads.orphans} onOpenThread={threads.onThreadOpen} />;
}
