import type { WikiGitContext, WikiLote, WikiPageRef, WikiSearchHit, WikiSource } from "../types";

export function fakeWiki(overrides?: Partial<WikiSource>): WikiSource {
  const pages: Record<string, { title: string; markdown: string }> = {
    "docs/index.md": { title: "Índice", markdown: "# Índice\n\nBienvenido al wiki." },
    "docs/producto/hola.md": { title: "Hola", markdown: "# Hola\n\nPágina de saludo." },
    "docs/guia/uñas.md": { title: "Cómo cortarse las uñas", markdown: "# Uñas\n\nUsa tijeras." },
  };

  const base: WikiSource = {
    contentPath: "docs",
    async listPages(limit) {
      const refs: WikiPageRef[] = Object.keys(pages).map((path) => ({
        path,
        title: pages[path].title,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }));
      return refs.slice(0, limit);
    },
    async readPage(path) {
      const page = pages[path];
      return page
        ? { path, markdown: page.markdown, frontmatter: { title: page.title } }
        : null;
    },
    async searchPages(query, limit) {
      const q = query.trim().toLowerCase();
      const hits: WikiSearchHit[] = Object.keys(pages)
        .filter(
          (path) =>
            path.toLowerCase().includes(q) || pages[path].title.toLowerCase().includes(q),
        )
        .slice(0, limit)
        .map((path) => ({ path, title: pages[path].title }));
      return hits;
    },
    async gitContext(): Promise<WikiGitContext> {
      return {
        workspace: true,
        branch: "main",
        status: " M docs/hola.md",
        diff: "1 file changed",
      };
    },
    async reviewLote(): Promise<WikiLote> {
      return null;
    },
  };

  return { ...base, ...overrides };
}