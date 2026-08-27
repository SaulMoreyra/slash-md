import path from "node:path";

/** Dirs GUI apps miss because they don't inherit the shell PATH. */
export function ghSearchDirs(home: string): string[] {
  return ["/opt/homebrew/bin", "/usr/local/bin", path.join(home, "bin"), path.join(home, ".local", "bin")];
}

export function withGhSearchPath(
  envPath: string | undefined,
  home: string,
  delimiter = path.delimiter,
): string {
  const existing = (envPath ?? "").split(delimiter).filter(Boolean);
  const seen = new Set(existing);
  const prefix = ghSearchDirs(home).filter((dir) => !seen.has(dir));
  return [...prefix, ...existing].join(delimiter);
}
