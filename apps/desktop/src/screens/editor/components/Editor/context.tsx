import { createContext, use } from "react";
import type { EditorControllerApi } from "../../hooks/useEditorController";

export const EditorContext = createContext<EditorControllerApi | null>(null);

export function useEditor(): EditorControllerApi {
  const value = use(EditorContext);
  if (!value) {
    throw new Error("useEditor must be used within Editor");
  }
  return value;
}

export function useEditorOptional(): EditorControllerApi | null {
  return use(EditorContext);
}
