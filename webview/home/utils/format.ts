export function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) {
    return "";
  }
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 45) {
    return "ahora";
  }
  if (sec < 3600) {
    return `${Math.floor(sec / 60)}m`;
  }
  if (sec < 86400) {
    return `${Math.floor(sec / 3600)}h`;
  }
  if (sec < 86400 * 14) {
    return `${Math.floor(sec / 86400)}d`;
  }
  return new Date(t).toLocaleDateString();
}

export function shortDraftPath(path: string, contentPath: string): string {
  if (!contentPath) {
    return path;
  }
  const prefix = `${contentPath}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
