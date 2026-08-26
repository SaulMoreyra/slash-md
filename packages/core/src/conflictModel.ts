/** Wiki sync / merge-conflict helpers. Git jargon stays out of the UI layer. */

export type WikiSyncStatus = "idle" | "behind" | "conflicting" | "merging";

export type ConflictFileKind = "edit" | "binary" | "deleted_on_wiki" | "deleted_on_publication";

export type ConflictChoice = "ours" | "theirs" | { markdown: string };

export type UnmergedEntry = {
  path: string;
  stages: number[];
};

const BINARY_EXT = /\.(png|jpe?g|gif|webp|svg|ico|pdf|mp4|mov|zip|woff2?)$/i;

export function isBinaryPath(repoPath: string): boolean {
  return BINARY_EXT.test(repoPath);
}

export function classifyUnmerged(stages: number[], repoPath: string): ConflictFileKind {
  const hasOurs = stages.includes(2);
  const hasTheirs = stages.includes(3);
  if (hasOurs && !hasTheirs) {
    return "deleted_on_wiki";
  }
  if (!hasOurs && hasTheirs) {
    return "deleted_on_publication";
  }
  if (isBinaryPath(repoPath)) {
    return "binary";
  }
  return "edit";
}

/** Parse `git ls-files -u` into paths + index stages (1 base, 2 ours, 3 theirs). */
export function parseLsFilesUnmerged(stdout: string): UnmergedEntry[] {
  const byPath = new Map<string, Set<number>>();
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    const tab = line.indexOf("\t");
    const meta = tab >= 0 ? line.slice(0, tab) : line;
    const filePath = (tab >= 0 ? line.slice(tab + 1) : "").replace(/\\/g, "/");
    const parts = meta.trim().split(/\s+/);
    const stage = Number(parts[2]);
    if (!filePath || !Number.isFinite(stage)) {
      continue;
    }
    const stages = byPath.get(filePath) ?? new Set<number>();
    stages.add(stage);
    byPath.set(filePath, stages);
  }
  return [...byPath.entries()].map(([path, stages]) => ({
    path,
    stages: [...stages].toSorted((a, b) => a - b),
  }));
}

export function wikiSyncStatusFromPull(pr: {
  mergeable?: boolean | null;
  mergeable_state?: string;
}): WikiSyncStatus {
  const state = (pr.mergeable_state ?? "").toLowerCase();
  if (pr.mergeable === false || state === "dirty") {
    return "conflicting";
  }
  if (state === "behind") {
    return "behind";
  }
  return "idle";
}

/** Electron wraps host throws as `Error invoking remote method 'x': Error: …`. */
const IPC_INVOKE_PREFIX = /^Error invoking remote method '[^']+': (?:Error: )?/i;

export function unwrapHostError(message: string): string {
  return message.replace(IPC_INVOKE_PREFIX, "").trim();
}

export function isConflictPublishError(message: string): boolean {
  return /(^|·\s*)conflict(\s*·|$)/i.test(unwrapHostError(message));
}

/** Drop conflict markers, keeping the ours side when possible. */
export function stripConflictMarkers(text: string): string {
  if (!text.includes("<<<<<<<") || !text.includes(">>>>>>>")) {
    return text;
  }
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let mode: "copy" | "ours" | "theirs" = "copy";
  for (const line of lines) {
    if (line.startsWith("<<<<<<<")) {
      mode = "ours";
      continue;
    }
    if (mode !== "copy" && /^=======\s*$/.test(line)) {
      mode = "theirs";
      continue;
    }
    if (mode !== "copy" && line.startsWith(">>>>>>>")) {
      mode = "copy";
      continue;
    }
    if (mode === "theirs") {
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

export function markdownExcerpt(markdown: string, max = 420): string {
  const withoutFm = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const trimmed = withoutFm.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max).trimEnd()}…`;
}
