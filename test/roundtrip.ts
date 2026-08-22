import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSlashCrepe } from "../webview/crepe";
import { normalizeMarkdown } from "../src/markdown";
import { slashItemsMatching } from "../webview/slash";
import { setFrontmatterField, splitFrontmatter } from "../src/frontmatter";
import { rewriteLinksForMove, rewriteLinksTo } from "../src/links";
import { referencedImages } from "../src/images";
import { imageMarkdownSrc } from "../src/paths";
import { runCommentFixtures } from "./comments";

export async function run(): Promise<void> {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const fixturesDir = path.join(root, "fixtures");

  let failed = 0;

  function assert(ok: boolean, message: string): void {
    if (ok) {
      console.log(`ok  ${message}`);
      return;
    }
    failed += 1;
    console.error(`FAIL ${message}`);
  }

  function visible(value: string): string {
    return value.replace(/\n/g, "¶\n");
  }

  assert(slashItemsMatching("h1").includes("h1"), "/h1 matches Heading 1");
  assert(slashItemsMatching("title1").includes("h1"), "/title1 matches Heading 1");
  assert(slashItemsMatching("code").includes("code"), "/code matches code block");
  assert(slashItemsMatching("callout").includes("callout"), "/callout matches callout");
  assert(slashItemsMatching("info").includes("callout"), "/info matches callout");
  assert(slashItemsMatching("warning").includes("warning"), "/warning matches warning");
  assert(slashItemsMatching("toggle").includes("toggle"), "/toggle matches toggle");
  assert(!slashItemsMatching("h1").includes("h2"), "/h1 does not match H2");

  {
    const src = "---\ntitle: Uno\nstatus: draft\nupdated: 2026-08-21\n---\n\n# Uno\n";
    const next = setFrontmatterField(src, "status", "review");
    assert(next.includes("status: review"), "frontmatter status updates");
    assert(next.split("\n").filter((line) => line.startsWith("title:")).length === 1, "frontmatter keeps title");
    const titleLine = src.split("\n").find((line) => line.startsWith("title:"));
    const nextTitle = next.split("\n").find((line) => line.startsWith("title:"));
    assert(titleLine === nextTitle, "editing status does not rewrite title line");
    assert(splitFrontmatter(next).body === splitFrontmatter(src).body, "frontmatter edit keeps body");
  }

  {
    const src = "---\ntitle: Cover\n---\n\n# Cover\n";
    const withCover = setFrontmatterField(src, "cover", "../images/banner.jpg");
    assert(withCover.includes("cover: ../images/banner.jpg"), "frontmatter cover sets path");
    assert(splitFrontmatter(withCover).body === splitFrontmatter(src).body, "cover edit keeps body");
    const cleared = setFrontmatterField(withCover, "cover", "");
    assert(!cleared.includes("cover:"), "empty cover drops YAML line");
    assert(splitFrontmatter(cleared).fields.cover === "", "cleared cover field is empty");
  }

  {
    const md = "---\ntitle: X\ncover: ../images/x.jpg\n---\n\n# X\n\n![](../images/inline.png)\n";
    const refs = referencedImages(md, "docs/prd/x.md");
    assert(
      refs.some((r) => r.src === "../images/x.jpg" && r.repoPath === "docs/images/x.jpg"),
      "referencedImages includes cover path",
    );
    assert(
      refs.some((r) => r.src === "../images/inline.png"),
      "referencedImages still includes body images",
    );
  }

  {
    const md = "---\ntitle: X\ncover: https://example.com/banner.jpg\n---\n\n# X\n";
    const refs = referencedImages(md, "docs/x.md");
    assert(refs.length === 0, "referencedImages ignores https cover");
  }

  {
    const md = "---\ntitle: X\ncover: color:#D3E5EF\n---\n\n# X\n";
    const refs = referencedImages(md, "docs/x.md");
    assert(refs.length === 0, "referencedImages ignores color cover");
    assert(splitFrontmatter(md).fields.cover === "color:#D3E5EF", "color cover stored in YAML");
  }

  {
    const md = "---\ntitle: X\ncover: ../images/banner.jpg\n---\n\n# X\n\nSee [pic](../images/banner.jpg).\n";
    const moved = rewriteLinksForMove(md, "docs/prd/x.md", "docs/prd/nested/x.md");
    assert(
      splitFrontmatter(moved).fields.cover === "../../images/banner.jpg",
      "move rewrites cover relative path",
    );
  }

  assert(imageMarkdownSrc("docs/foo.md", "docs", "pic.png") === "images/pic.png", "image src at docs root");
  assert(imageMarkdownSrc("docs/prd/foo.md", "docs", "pic.png") === "../images/pic.png", "image src nested");

  {
    const other = "Lee [este](../old/doc.md) y [otro](https://example.com).";
    const rewritten = rewriteLinksTo(other, "docs/prd/a.md", "docs/old/doc.md", "docs/new/doc.md");
    assert(rewritten.includes("](../new/doc.md)"), "rename rewrites relative link");
    assert(rewritten.includes("https://example.com"), "rename keeps external link");
  }

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
    assert(
      normalizeMarkdown(draftSeed) === normalizeMarkdown(out),
      "round-trip # Untitled (new draft)",
    );
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
      failed += 1;
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
      failed += 1;
      console.error(`FAIL idempotent ${name}`);
      console.error("--- first ---");
      console.error(visible(once));
      console.error("--- second ---");
      console.error(visible(twice));
      continue;
    }

    console.log(`ok  round-trip ${name}`);
  }

  await runCommentFixtures(assert);

  if (failed > 0) {
    process.exitCode = 1;
  }
}
