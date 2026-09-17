import type { EditorSlotApi } from "../hooks/useEditorSlotController";
import { EditorPanel } from "./EditorPanel";

export function EditorStack(props: EditorSlotApi) {
  const { items } = props;
  return (
    <div className="relative flex min-h-0 flex-1">
      <EditorList {...props} items={items} />
    </div>
  );
}

function EditorList({ items, ...shared }: EditorSlotApi) {
  return (
    <>
      {items.map(({ key, ...item }) => (
        <EditorPanel key={key} {...item} {...shared} />
      ))}
    </>
  );
}