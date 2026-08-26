import { Editor } from "./components/Editor";
import type { EditorScreenProps } from "./hooks/useEditorController";

export type { EditorScreenProps };

/** Thin screen — composition lives in `Editor` compound. */
export function EditorScreen(props: EditorScreenProps) {
  return <Editor {...props} />;
}
