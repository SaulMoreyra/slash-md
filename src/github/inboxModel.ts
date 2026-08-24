import { posixNormalize } from "../domain/paths";

export type InboxItem = {
  prNumber: number;
  prUrl: string;
  path: string;
  threadId: string;
  excerpt: string;
  author: string;
  createdAt: string;
  snippet?: string;
  line?: number | null;
  startLine?: number | null;
};

export type InboxPullSeed = {
  number: number;
  url: string;
  author?: string;
  threads: Array<{
    id: string;
    isResolved: boolean;
    path: string | null;
    line: number | null;
    startLine: number | null;
    diffSide: "LEFT" | "RIGHT" | null;
    body?: string;
    author?: string;
    createdAt?: string;
  }>;
};

/** `.md` under contentPath, never `.slash.md`. */
export function isInboxMarkdownPath(path: string, contentPath: string): boolean {
  const normalized = posixNormalize(path);
  if (!normalized || !normalized.endsWith(".md") || normalized.endsWith(".slash.md")) {
    return false;
  }
  const root = posixNormalize(contentPath);
  if (!root) {
    return true;
  }
  return normalized === root || normalized.startsWith(`${root}/`);
}

export function trimExcerpt(body: string, max = 140): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (!flat) {
    return "";
  }
  if (flat.length <= max) {
    return flat;
  }
  return `${flat.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function keepInboxPull(opts: {
  author?: string;
  viewer?: string;
  hasUnresolved: boolean;
}): boolean {
  const author = opts.author?.trim().toLowerCase() ?? "";
  const viewer = opts.viewer?.trim().toLowerCase() ?? "";
  const isAuthor = Boolean(author && viewer && author === viewer);
  return isAuthor || opts.hasUnresolved;
}

export function snippetFromLines(
  text: string,
  startLine: number | null,
  line: number | null,
): string {
  if (startLine == null && line == null) {
    return "";
  }
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const end = Math.max(1, line ?? startLine ?? 1);
  const start = Math.max(1, startLine ?? line ?? end);
  const from = Math.min(start, end) - 1;
  const to = Math.max(start, end);
  return lines.slice(from, to).join("\n").trimEnd();
}

export function flattenInboxItems(opts: {
  pulls: InboxPullSeed[];
  viewer: string;
  contentPath: string;
}): InboxItem[] {
  const items: InboxItem[] = [];
  for (const pull of opts.pulls) {
    const unresolved = pull.threads.filter((thread) => !thread.isResolved);
    if (
      !keepInboxPull({
        author: pull.author,
        viewer: opts.viewer,
        hasUnresolved: unresolved.length > 0,
      })
    ) {
      continue;
    }
    for (const thread of unresolved) {
      if (thread.diffSide === "LEFT") {
        continue;
      }
      const path = thread.path ?? "";
      if (!isInboxMarkdownPath(path, opts.contentPath)) {
        continue;
      }
      items.push({
        prNumber: pull.number,
        prUrl: pull.url,
        path,
        threadId: thread.id,
        excerpt: trimExcerpt(thread.body ?? ""),
        author: thread.author?.trim() || "unknown",
        createdAt: thread.createdAt ?? "",
        line: thread.line,
        startLine: thread.startLine,
      });
    }
  }
  items.sort((a, b) => {
    const tb = Date.parse(b.createdAt);
    const ta = Date.parse(a.createdAt);
    const nb = Number.isFinite(tb) ? tb : 0;
    const na = Number.isFinite(ta) ? ta : 0;
    return nb - na;
  });
  return items;
}
