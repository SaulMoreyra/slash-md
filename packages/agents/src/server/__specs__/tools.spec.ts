import { describe, expect, it, vi } from "vitest";
import { createWikiTools } from "../tools";
import { clampLimit, normalizeWikiPath } from "../types";
import { fakeWiki } from "../__specs__/fakeWiki";

function textOf(result: Awaited<ReturnType<ReturnType<typeof createWikiTools>["list_pages"]>>): string {
  return result.content[0].text;
}

describe("normalizeWikiPath", () => {
  it.each([
    ["docs/a.md"],
    ["docs/producto/hola.md"],
    ["docs/guía con espacios.md"],
  ])("accepts %s", (value) => {
    expect(normalizeWikiPath(value)).toBe(value);
  });

  it("strips a leading ./", () => {
    expect(normalizeWikiPath("./docs/a.md")).toBe("docs/a.md");
  });

  it.each([
    "../secret.md",
    "/abs/secret.md",
    "C:\\Windows\\secret.md",
    "docs/../secret.md",
    "a//b.md",
    "",
  ])("rejects %s", (value) => {
    expect(() => normalizeWikiPath(value)).toThrow(/no válida/i);
  });
});

describe("clampLimit", () => {
  it("clamps and floors", () => {
    expect(clampLimit(undefined, 100, 200)).toBe(100);
    expect(clampLimit(0, 100, 200)).toBe(1);
    expect(clampLimit(9999, 100, 200)).toBe(200);
    expect(clampLimit(3.9, 100, 200)).toBe(3);
    expect(clampLimit("x", 100, 200)).toBe(100);
  });
});

describe("createWikiTools", () => {
  it("list_pages devuelve el listado con títulos y paths", async () => {
    const tools = createWikiTools(fakeWiki());
    const list = await tools.list_pages({});
    const text = textOf(list);
    expect(text).toContain("Páginas (3)");
    expect(text).toContain("docs/producto/hola.md");
    expect(text).toContain("docs/guia/uñas.md");
    expect(list.isError).toBeUndefined();
  });

  it("list_pages respeta el límite", async () => {
    const writer = fakeWiki();
    const spy = vi.spyOn(writer, "listPages");
    const tools = createWikiTools(writer);
    await tools.list_pages({ limit: 2 });
    expect(spy).toHaveBeenCalledWith(2);
  });

  it("list_pages falla con granero vacío", async () => {
    const tools = createWikiTools(fakeWiki({ listPages: async () => [] }));
    const text = textOf(await tools.list_pages({}));
    expect(text).toContain("No hay páginas");
  });

  it("read_page devuelve frontmatter + markdown", async () => {
    const tools = createWikiTools(fakeWiki());
    const res = await tools.read_page({ path: "docs/producto/hola.md" });
    const text = textOf(res);
    expect(text).toContain('"title":"Hola"');
    expect(text).toContain("# Hola");
    expect(res.isError).toBeUndefined();
  });

  it("read_page falla cuando la página no existe", async () => {
    const tools = createWikiTools(fakeWiki());
    const res = await tools.read_page({ path: "docs/nope.md" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("No existe");
  });

  it("read_page rechaza traversal de path", async () => {
    const tools = createWikiTools(fakeWiki());
    const res = await tools.read_page({ path: "../secret.md" });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("no válida");
  });

  it("search_pages devuelve coincidencias por título", async () => {
    const tools = createWikiTools(fakeWiki());
    const res = await tools.search_pages({ query: "uñas", limit: 10 });
    const text = textOf(res);
    expect(text).toContain("Resultados (1)");
    expect(text).toContain("docs/guia/uñas.md");
    expect(res.isError).toBeUndefined();
  });

  it("search_pages sin resultados", async () => {
    const tools = createWikiTools(fakeWiki());
    const res = await tools.search_pages({ query: "zzz", limit: 10 });
    expect(textOf(res)).toContain("Sin resultados");
  });

  it("search_pages exige query", async () => {
    const tools = createWikiTools(fakeWiki());
    const res = await tools.search_pages({ query: "  ", limit: 10 });
    expect(res.isError).toBe(true);
  });

  it("get_git_context formatea rama y estado", async () => {
    const tools = createWikiTools(fakeWiki());
    const res = await tools.get_git_context({});
    const text = textOf(res);
    expect(text).toContain("Rama: main");
    expect(text).toContain(" M docs/hola.md");
    expect(text).toContain("1 file changed");
  });

  it("get_git_context sin workspace", async () => {
    const tools = createWikiTools(fakeWiki({
      gitContext: async () => ({ workspace: false, status: "No es un repo git." }),
    }));
    const text = textOf(await tools.get_git_context({}));
    expect(text).toContain("No es un repo git");
  });

  it("get_review_lote sin lote activo", async () => {
    const tools = createWikiTools(fakeWiki());
    const text = textOf(await tools.get_review_lote({}));
    expect(text).toContain("No hay lote de revisión activo");
  });

  it("get_review_lote con rama y archivos", async () => {
    const tools = createWikiTools(fakeWiki({
      reviewLote: async () => ({ branch: "review/ronda-3", files: ["docs/a.md", "docs/b.md"] }),
    }));
    const text = textOf(await tools.get_review_lote({}));
    expect(text).toContain("review/ronda-3");
    expect(text).toContain("docs/a.md");
    expect(text).toContain("docs/b.md");
  });
});