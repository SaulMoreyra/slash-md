import { posixBasename } from "@slash-md/core/paths";

export const TAB_LABEL_MAX = 24;

export function clampLabel(label: string): string {
  if (label.length <= TAB_LABEL_MAX) {
    return label;
  }
  return `${label.slice(0, TAB_LABEL_MAX - 1)}…`;
}

export function tabLabel(path: string, title: string, untitled: string): string {
  const trimmed = title.trim();
  if (trimmed) {
    return trimmed;
  }
  const base = posixBasename(path).replace(/\.md$/i, "");
  return base || untitled;
}