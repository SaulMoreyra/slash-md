export type WikiPageRef = {
  /** Repo-relative posix path, e.g. `docs/producto/hola.md`. */
  path: string;
  title?: string;
  updatedAt?: string | null;
  tags?: string[];
};

export type WikiPage = {
  path: string;
  markdown: string;
  frontmatter?: Record<string, string>;
};

export type WikiSearchHit = WikiPageRef & { snippet?: string };

export type WikiLote = { branch?: string; files: string[] } | null;

export type WikiGitContext = {
  workspace: boolean;
  branch?: string;
  status: string;
  diff?: string;
};

/**
 * Backing source for the wiki MCP tools. Implemented by the host (Electron)
 * and faked in specs. All paths are repo-relative posix.
 */
export type WikiSource = {
  contentPath: string;
  listPages(limit: number): Promise<WikiPageRef[]>;
  readPage(path: string): Promise<WikiPage | null>;
  searchPages(query: string, limit: number): Promise<WikiSearchHit[]>;
  gitContext(): Promise<WikiGitContext>;
  reviewLote(): Promise<WikiLote>;
};

/** Clean a tool-supplied page path into a safe repo-relative posix path. */
export function normalizeWikiPath(value: string): string {
  const trimmed = value.trim().replace(/^\.\//, "");
  if (
    !trimmed ||
    trimmed.startsWith("/") ||
    trimmed.includes("\\") ||
    /^[a-zA-Z]:/.test(trimmed)
  ) {
    throw new Error(`Ruta de página no válida: "${value}"`);
  }
  const parts = trimmed.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Ruta de página no válida: "${value}"`);
  }
  return trimmed;
}

export function clampLimit(value: unknown, fallback: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.max(1, Math.min(max, n));
}