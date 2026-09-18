import { describe, expect, it } from "vitest";
import { CONTEXT_LIMITS, buildPrompt, serializeContext, truncate } from "../context";
import { ChatMode } from "../types";

describe("truncate", () => {
  it("leaves short values untouched", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });

  it("caps long values and reports how much was dropped", () => {
    const result = truncate("a".repeat(20), 10);
    expect(result).toContain("a".repeat(10));
    expect(result).toContain("10 caracteres omitidos");
  });
});

describe("serializeContext", () => {
  it("renders workspace, page, tree, git and lote sections", () => {
    const markdown = serializeContext({
      workspace: { contentPath: "docs", mode: "workspace", branch: "feat/x" },
      page: { path: "docs/a.md", frontmatter: "title: A", body: "# A\n\ncuerpo" },
      tree: { sections: ["docs"], pages: [{ path: "docs/a.md", title: "A" }] },
      git: { branch: "feat/x", status: [" M docs/a.md"], diffStat: ["docs/a.md +1 -0"] },
      lote: { prNumber: 7, title: "Chat", branch: "feat/x", paths: ["docs/a.md"] },
    });

    expect(markdown).toContain("## Contexto del wiki");
    expect(markdown).toContain("### Página actual: docs/a.md");
    expect(markdown).toContain("~~~yaml\ntitle: A\n~~~");
    expect(markdown).toContain("# A\n\ncuerpo");
    expect(markdown).toContain("- docs/a.md — A");
    expect(markdown).toContain("PR #7: Chat");
  });

  it("lists sibling pages and caps them", () => {
    const siblings = Array.from(
      { length: CONTEXT_LIMITS.pageSiblings + 3 },
      (_, index) => `docs/${index}.md`,
    );
    const markdown = serializeContext({
      page: { path: "docs/a.md", frontmatter: "", body: "# A", siblings },
    });
    expect(markdown).toContain("Hermanas (misma carpeta):");
    expect(markdown).toContain("- docs/0.md");
    expect(markdown).not.toContain("- docs/32.md");
  });

  it("omits sections that are absent", () => {
    const markdown = serializeContext({});
    expect(markdown).toBe("## Contexto del wiki");
  });

  it("caps the number of tree pages", () => {
    const pages = Array.from({ length: CONTEXT_LIMITS.treePages + 5 }, (_, index) => ({
      path: `docs/${index}.md`,
      title: `${index}`,
    }));
    const markdown = serializeContext({ tree: { sections: [], pages } });
    expect(markdown).toContain("5 páginas más");
  });
});

describe("buildPrompt", () => {
  it("prepends the context and asks for the same language", () => {
    const prompt = buildPrompt({ mode: ChatMode.Chat, prompt: "¿Qué es X?", context: "CTX" });
    expect(prompt.startsWith("CTX")).toBe(true);
    expect(prompt).toContain("# Pregunta\n¿Qué es X?");
    expect(prompt).toContain("mismo idioma");
  });

  it("instructs a fenced, complete body in edit mode", () => {
    const prompt = buildPrompt({ mode: ChatMode.EditPage, prompt: "Hazlo más corto" });
    expect(prompt).toContain("# Tarea: editar la página actual");
    expect(prompt).toContain("bloque ```markdown");
    expect(prompt).toContain("Hazlo más corto");
  });
});
