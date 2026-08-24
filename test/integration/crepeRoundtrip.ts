import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createSlashCrepe } from "../../webview/editor/core/crepe";
import { normalizeMarkdown } from "../../src/domain/markdown";
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
