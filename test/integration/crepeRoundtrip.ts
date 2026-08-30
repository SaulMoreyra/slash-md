import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createSlashCrepe } from "../../packages/ui/src/editor/core/crepe";
import { normalizeMarkdown } from "@slash-md/core/markdown";
import type { SuiteCtx } from "../harness";

export async function runCrepeRoundtripSuite(ctx: SuiteCtx): Promise<void> {
  const { assert, fixturesDir, fail, visible } = ctx;

  const files = (await readdir(fixturesDir)).filter((name) => name.endsWith(".md")).sort();
  if (files.length === 0) {
    assert(false, "fixtures/*.md exist");
  }

  const draftSeed = "# Untitled\n";
  {
    const host = document.createElement("div");
    document.body.append(host);
    const crepe = await createSlashCrepe({ root: host, markdown: draftSeed });
    const out = crepe.getMarkdown();
    await crepe.destroy();
    host.remove();
    assert(normalizeMarkdown(draftSeed) === normalizeMarkdown(out), "round-trip # Untitled (new draft)");
  }

  {
    const source = "* [ ] pendiente\n* [x] hecho\n- [ ]\n";
    const host = document.createElement("div");
    document.body.append(host);
    const crepe = await createSlashCrepe({ root: host, markdown: source });
    const unchecked = host.querySelectorAll(".label.unchecked").length;
    const checked = host.querySelectorAll(".label.checked").length;
    const bodyText = host.textContent ?? "";
    const out = crepe.getMarkdown();
    await crepe.destroy();
    host.remove();
    assert(unchecked === 2, "unchecked task items render checkbox labels");
    assert(checked === 1, "checked task item renders checkbox label");
    assert(!bodyText.includes("[ ]") && !bodyText.includes("[x]"), "task markers are not left as literal text");
    assert(out.includes("[ ]") && out.includes("[x]"), "task items serialize checkbox syntax");
  }

  {
    // Crepe desplaza el node view de prosemirror-tables y con él el <colgroup>.
    // Sin colgroup, `displayColumnWidth` trata al <tbody> como si lo fuera y borra
    // filas durante el arrastre. Ver docs/plans/12-tablas-resize-columnas.md.
    const source = "| A | B | C |\n| - | - | - |\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |\n";
    const host = document.createElement("div");
    document.body.append(host);
    const crepe = await createSlashCrepe({ root: host, markdown: source });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const table = host.querySelector("table.children");
    const colgroup = table?.firstElementChild;
    const cols = table?.querySelectorAll("colgroup > col").length ?? 0;
    const rows = table?.querySelectorAll("tr").length ?? 0;
    const out = crepe.getMarkdown();
    await crepe.destroy();
    host.remove();
    assert(colgroup?.tagName === "COLGROUP", "table renders a colgroup as first child");
    assert(cols === 3, `colgroup has one col per column (got ${cols})`);
    assert(rows === 3, `colgroup does not disturb the rows (got ${rows})`);
    assert(normalizeMarkdown(source) === normalizeMarkdown(out), "colgroup is not serialized to markdown");
  }

  {
    // `tablePipeAlign: false` (crepe.ts). Si el config no llega a tiempo, remark
    // vuelve a rellenar las celdas y editar una palabra re-alinea la tabla entera.
    // Ver docs/plans/13-tablas-markdown-estable.md.
    const source = "| Col | Descripción muy larga de la columna |\n| - | - |\n| a | b |\n";
    const host = document.createElement("div");
    document.body.append(host);
    const crepe = await createSlashCrepe({ root: host, markdown: source });
    const out = crepe.getMarkdown();
    await crepe.destroy();
    host.remove();
    const padded = out.split("\n").filter((line) => /\| {2,}| {2,}\||-{3,}/.test(line));
    assert(padded.length === 0, `table cells are not padded (got ${JSON.stringify(padded)})`);
    assert(normalizeMarkdown(source) === normalizeMarkdown(out), "compact table round-trips unchanged");
  }

  {
    // El schema `image-block` de Milkdown no tiene `alt`: guarda el `ratio` ahí y
    // `![Slash MD icon](x.png)` se volvía `![1.00](x.png)`.
    // Ver docs/plans/14-imagen-alt.md.
    const cases = [
      "![Slash MD icon](media/slash.png)\n",
      "![](foo.png)\n",
      '![alt](foo.png "un título")\n',
      "Párrafo con ![inline](x.png) en medio.\n",
    ];
    for (const source of cases) {
      const host = document.createElement("div");
      document.body.append(host);
      const crepe = await createSlashCrepe({ root: host, markdown: source });
      const out = crepe.getMarkdown();
      await crepe.destroy();
      host.remove();
      assert(
        normalizeMarkdown(source) === normalizeMarkdown(out),
        `image keeps its alt: ${JSON.stringify(source.trim())}`
      );
      assert(!out.includes("![1.00]"), `image alt is not replaced by the ratio: ${JSON.stringify(source.trim())}`);
    }
  }

  for (const name of files) {
    const source = await readFile(path.join(fixturesDir, name), "utf8");
    const host = document.createElement("div");
    document.body.append(host);
    const crepe = await createSlashCrepe({ root: host, markdown: source });
    const once = crepe.getMarkdown();
    await crepe.destroy();
    host.remove();

    const expected = normalizeMarkdown(source);
    const actual = normalizeMarkdown(once);
    if (expected !== actual) {
      fail();
      console.error(`FAIL round-trip ${name}`);
      console.error("--- expected ---");
      console.error(visible(expected));
      console.error("--- actual ---");
      console.error(visible(actual));
      continue;
    }

    const host2 = document.createElement("div");
    document.body.append(host2);
    const crepe2 = await createSlashCrepe({ root: host2, markdown: once });
    const twice = crepe2.getMarkdown();
    await crepe2.destroy();
    host2.remove();

    if (normalizeMarkdown(once) !== normalizeMarkdown(twice)) {
      fail();
      console.error(`FAIL idempotent ${name}`);
      console.error("--- first ---");
      console.error(visible(once));
      console.error("--- second ---");
      console.error(visible(twice));
      continue;
    }

    console.log(`ok  round-trip ${name}`);
  }
}
