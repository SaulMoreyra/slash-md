import { EditorStack } from "./components/EditorStack";
import { useEditorSlotController } from "./hooks/useEditorSlotController";

export function EditorSlot() {
  const controller = useEditorSlotController();
  if (controller.empty) {
    return null;
  }
  return <EditorStack {...controller} />;
}

EditorSlot.displayName = "App.Editor";