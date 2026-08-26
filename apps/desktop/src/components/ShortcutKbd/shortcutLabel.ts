export function isApplePlatform(): boolean {
  return /Mac|iPhone|iPad|Macintosh/.test(navigator.platform) || /Mac OS/.test(navigator.userAgent);
}

function mod(): string {
  return isApplePlatform() ? "⌘" : "Ctrl";
}

function shiftMod(key: string): string {
  return isApplePlatform() ? `⌘⇧${key}` : `Ctrl+Shift+${key}`;
}

/** Platform-aware shortcut labels for UI hints. */
export const shortcutLabel = {
  search: () => `${mod()}K`,
  newPage: () => `${mod()}N`,
  newFolder: () => shiftMod("N"),
  settings: () => `${mod()},`,
  drafts: () => `${mod()}1`,
  reviews: () => `${mod()}2`,
  inbox: () => `${mod()}3`,
  publications: () => `${mod()}4`,
  refresh: () => shiftMod("R"),
  togglePane: () => (isApplePlatform() ? "⌘\\" : "Ctrl+\\"),
  toggleRail: () => (isApplePlatform() ? "⌘⇧\\" : "Ctrl+Shift+\\"),
  closePage: () => `${mod()}W`,
  save: () => `${mod()}S`,
  escape: () => "Esc",
} as const;
