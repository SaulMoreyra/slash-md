import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildSite } from "../../apps/reader/src/build-site";
import { resolveInternalHref } from "../../apps/reader/src/links";
import type { SuiteCtx } from "../harness";

export async function runReaderSiteSuite(ctx: SuiteCtx): Promise<void> {
  const { assert, root } = ctx;
  const wiki = path.join(root, "apps/reader/fixtures/wiki");
  const readerDir = path.join(root, "apps/reader");
  const out = await fs.mkdtemp(path.join(os.tmpdir(), "slash-md-site-"));

  const skipped = await buildSite({
    root: path.join(root, "apps/reader/fixtures/wiki-off"),
    out: path.join(out, "off"),
    readerDir,
  });
  assert(skipped.skipped === true, "disabled site skips build");
  try {
    await fs.stat(path.join(out, "off"));
    assert(false, "skipped build does not write out");
  } catch {
    assert(true, "skipped build does not write out");
  }

  const built = await buildSite({ root: wiki, out: path.join(out, "on"), readerDir });
  if (built.skipped) {
    assert(false, "enabled fixture builds");
    return;
  }
  assert(built.pages.length === 3, "fixture publishes three pages");
  assert(
    built.pages.every((page) => !page.path.includes("_templates")),
    "templates are not published",
  );
  const index = await fs.readFile(path.join(built.out, "index.html"), "utf8");
  assert(index.includes("window.__SLASH_MD__"), "root page has boot payload");
  await fs.stat(path.join(built.out, ".nojekyll"));
  await fs.stat(path.join(built.out, "manifest.json"));
  await fs.stat(path.join(built.out, "getting-started/index.html"));
  await fs.stat(path.join(built.out, "producto/guia/index.html"));
  await fs.stat(path.join(built.out, "content/images/dot.svg"));
  const manifest = JSON.parse(await fs.readFile(path.join(built.out, "manifest.json"), "utf8")) as {
    pages: { path: string; route: string }[];
  };
  assert(manifest.pages.some((page) => page.path === "README.md" && page.route === "/"), "README route is /");
  assert(
    !manifest.pages.some((page) => page.path.includes("_templates")),
    "manifest omits templates",
  );

  const pages = [
    { path: "README.md", title: "Home", route: "/", content: "content/README.md" },
    { path: "getting-started.md", title: "Getting started", route: "/getting-started/", content: "content/getting-started.md" },
  ];
  assert(resolveInternalHref("README.md", "getting-started.md", pages) === "/getting-started/", "internal md href maps to route");
  assert(resolveInternalHref("README.md", "https://example.com", pages) === undefined, "external href is not a page route");
}
