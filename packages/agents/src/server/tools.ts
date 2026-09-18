import type {
  WikiGitContext,
  WikiLote,
  WikiPage,
  WikiPageRef,
  WikiSearchHit,
  WikiSource,
} from "./types";
import { clampLimit, normalizeWikiPath } from "./types";

export const WIKI_TOOL_NAMES = [
  "list_pages",
  "read_page",
  "search_pages",
  "get_git_context",
  "get_review_lote",
] as const;

export type WikiToolName = (typeof WIKI_TOOL_NAMES)[number];

export type WikiToolResult = {
  content: [{ type: "text"; text: string }];
  isError?: boolean;
};

export function textResult(text: string): WikiToolResult {
  return { content: [{ type: "text", text }] };
}

export function textError(text: string): WikiToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export type WikiTools = Record<WikiToolName, (args: Record<string, unknown>) => Promise<WikiToolResult>>;

const PAGE_LIST_LIMIT = 100;
const PAGE_LIST_CAP = 200;
const SEARCH_LIMIT = 20;
const SEARCH_CAP = 100;

export function createWikiTools(wiki: WikiSource): WikiTools {
  return {
    async list_pages(args) {
      try {
        const limit = clampLimit(args.limit, PAGE_LIST_LIMIT, PAGE_LIST_CAP);
        const pages = await wiki.listPages(limit);
        return textResult(formatPageList(pages));
      } catch (err) {
        return textError(errorMessage(err));
      }
    },

    async read_page(args) {
      try {
        const safePath = normalizeWikiPath(String(args.path ?? ""));
        const page = await wiki.readPage(safePath);
        if (!page) {
          return textError(`No existe la página "${safePath}".`);
        }
        return textResult(formatPage(page));
      } catch (err) {
        return textError(errorMessage(err));
      }
    },

    async search_pages(args) {
      try {
        const query = String(args.query ?? "").trim();
        if (!query) {
          return textError("Falta el término de búsqueda (query).");
        }
        const limit = clampLimit(args.limit, SEARCH_LIMIT, SEARCH_CAP);
        const hits = await wiki.searchPages(query, limit);
        return textResult(formatHits(hits));
      } catch (err) {
        return textError(errorMessage(err));
      }
    },

    async get_git_context() {
      try {
        return textResult(formatGit(await wiki.gitContext()));
      } catch (err) {
        return textError(errorMessage(err));
      }
    },

    async get_review_lote() {
      try {
        return textResult(formatLote(await wiki.reviewLote()));
      } catch (err) {
        return textError(errorMessage(err));
      }
    },
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function formatPageList(pages: WikiPageRef[]): string {
  if (!pages.length) {
    return "No hay páginas en el wiki.";
  }
  const lines = pages.map(
    (p) => `- ${p.title ?? p.path}${p.updatedAt ? ` (actualizada ${p.updatedAt})` : ""} — \`${p.path}\``,
  );
  return `Páginas (${pages.length}):\n${lines.join("\n")}`;
}

function formatPage(page: WikiPage): string {
  const meta = page.frontmatter && Object.keys(page.frontmatter).length
    ? `Frontmatter: ${JSON.stringify(page.frontmatter)}\n\n`
    : "";
  return `${meta}${page.markdown || "(página vacía)"}`;
}

function formatHits(hits: WikiSearchHit[]): string {
  if (!hits.length) {
    return "Sin resultados.";
  }
  const lines = hits.map((h) => `- ${h.title ?? h.path} — \`${h.path}\``);
  return `Resultados (${hits.length}):\n${lines.join("\n")}`;
}

function formatGit(git: WikiGitContext): string {
  if (!git.workspace) {
    return git.status;
  }
  const head = git.branch ? `Rama: ${git.branch}` : "Rama: (sin rama)";
  const status = `Estado:\n${git.status}`;
  const diff = git.diff ? `\nDiferencias:\n${git.diff}` : "";
  return `${head}\n${status}${diff}`;
}

function formatLote(lote: WikiLote): string {
  if (!lote) {
    return "No hay lote de revisión activo.";
  }
  const branch = lote.branch ? `Rama de revisión: ${lote.branch}` : "Sin rama de revisión.";
  if (!lote.files.length) {
    return `${branch}\nSin archivos en revisión.`;
  }
  return `${branch}\nArchivos en revisión (${lote.files.length}):\n${lote.files
    .map((f) => `- \`${f}\``)
    .join("\n")}`;
}