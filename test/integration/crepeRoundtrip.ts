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
