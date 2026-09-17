import { posixBasename } from "@slash-md/core/paths";

export function tabLabel(path: string, title: string, untitled: string): string {
  const trimmed = title.trim();
  if (trimmed) {
    return trimmed;
  }
  const base = posixBasename(path).replace(/\.md$/i, "");
  return base || untitled;
}
