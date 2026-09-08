import fs from "node:fs/promises";
import path from "node:path";
import { buildHomeTree } from "@slash-md/core/homeTree";
import { referencedImages } from "@slash-md/core/images";
import { labeledTitle } from "@slash-md/core/messaging";
import { parseOwnerName } from "@slash-md/core/configTypes";
import { contentPathPrefix, posixBasename, posixJoin } from "@slash-md/core/paths";
import { parseSlashmd, siteEnabled } from "@slash-md/core/slashmd";
import { joinSitePath, normalizeBasePath, routeFor, stripContentPrefix } from "@slash-md/core/sitePages";
import { shellHtml, type SiteAssets } from "./shell";
import type { SiteManifest, SitePage } from "./types";
import { listPublishableMarkdown } from "./walk";

export type BuildSiteResult =
  | { skipped: true; reason: string }
  | { skipped: false; out: string; pages: SitePage[] };

type BuildSiteOpts = {
  root: string;
  out: string;
  basePath?: string;
  webAssetsDir: string;
};

export async function buildSite(opts: BuildSiteOpts): Promise<BuildSiteResult> {
  const file = await readSlashmdFile(opts.root);
  if (!siteEnabled(file)) {
    return { skipped: true, reason: "slash-md site: skipped (site.enabled is not true)" };
  }

  const contentPath = file.contentPath ?? ".";
  const prefix = contentPathPrefix(contentPath);
  const files = await listPublishableMarkdown(opts.root, contentPath, file.templatesPath);
  const titles = new Map<string, string>();
  for (const filePath of files) {
    titles.set(filePath, await titleFor(opts.root, filePath));
  }
  const tree = await buildHomeTree(prefix, files, file.sections ?? [], async (filePath) => titles.get(filePath) ?? posixBasename(filePath));

  const basePath = normalizeBasePath(opts.basePath ?? file.site?.basePath);
  const name = file.site?.name?.trim() || parseOwnerName(file.repo ?? "")?.name || "Docs";
  const pages: SitePage[] = files.map((filePath) => {
    const rel = stripContentPrefix(filePath, contentPath) || posixBasename(filePath);
    return {
      path: filePath,
      title: titles.get(filePath) ?? posixBasename(filePath),
      route: routeFor(filePath, contentPath, files),
      content: posixJoin("content", rel),
    };
  });

  await fs.rm(opts.out, { recursive: true, force: true });
  await fs.mkdir(path.join(opts.out, "assets"), { recursive: true });
  await fs.writeFile(path.join(opts.out, ".nojekyll"), "");

  const manifest: SiteManifest = { name, basePath, contentPath, tree, pages };
  await fs.writeFile(path.join(opts.out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  for (const page of pages) {
    const src = repoAbs(opts.root, page.path);
    const dest = path.join(opts.out, ...page.content.split("/"));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    const markdown = await fs.readFile(src, "utf8");
    for (const image of referencedImages(markdown, page.path)) {
      await copyIfExists(opts.root, opts.out, contentPath, image.repoPath);
    }
  }

  await copyImagesDir(opts.root, opts.out, contentPath);
  const assets = await copyWebAssets(opts.webAssetsDir, basePath, path.join(opts.out, "assets"));
  for (const page of pages) {
    const htmlPath = routeToHtmlPath(opts.out, page.route);
    await fs.mkdir(path.dirname(htmlPath), { recursive: true });
    await fs.writeFile(
      htmlPath,
      shellHtml(
        {
          basePath,
          page: page.path,
          manifestUrl: joinSitePath(basePath, "manifest.json"),
        },
        page.title === name ? name : `${page.title} · ${name}`,
        assets,
      ),
    );
  }
  return { skipped: false, out: opts.out, pages };
}

async function readSlashmdFile(root: string) {
  try {
    const raw = JSON.parse(await fs.readFile(path.join(root, ".slashmd.json"), "utf8")) as unknown;
    return parseSlashmd(raw);
  } catch {
    return parseSlashmd({});
  }
}

async function titleFor(root: string, filePath: string): Promise<string> {
  try {
    const text = await fs.readFile(repoAbs(root, filePath), "utf8");
    return labeledTitle(text, posixBasename(filePath));
  } catch {
    return posixBasename(filePath);
  }
}

function repoAbs(root: string, repoPath: string): string {
  return path.join(root, ...repoPath.split("/").filter(Boolean));
}

function routeToHtmlPath(out: string, route: string): string {
  if (route === "/") {
    return path.join(out, "index.html");
  }
  return path.join(out, ...route.split("/").filter(Boolean), "index.html");
}

async function copyIfExists(root: string, out: string, contentPath: string, repoPath: string): Promise<void> {
  const src = repoAbs(root, repoPath);
  try {
    await fs.stat(src);
  } catch {
    return;
  }
  const rel = stripContentPrefix(repoPath, contentPath) || posixBasename(repoPath);
  const dest = path.join(out, "content", ...rel.split("/"));
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function copyImagesDir(root: string, out: string, contentPath: string): Promise<void> {
  const prefix = contentPathPrefix(contentPath);
  const repoImages = posixJoin(prefix, "images");
  const src = repoAbs(root, repoImages);
  try {
    const stat = await fs.stat(src);
    if (!stat.isDirectory()) {
      return;
    }
  } catch {
    return;
  }
  await fs.cp(src, path.join(out, "content", "images"), { recursive: true });
}

async function copyWebAssets(webAssetsDir: string, basePath: string, destDir: string): Promise<SiteAssets> {
  const files = await fs.readdir(webAssetsDir).catch(() => [] as string[]);
  const entryHtml = files.find((file) => file.endsWith(".html"));
  if (!entryHtml) {
    return { css: [], js: [] };
  }
  const html = await fs.readFile(path.join(webAssetsDir, entryHtml), "utf8");
  const assetName = (attrib: string, suffix: string): string | null => {
    const match = html.match(new RegExp(`${attrib}="\\.\\/assets\\/([^"]+${suffix})"`));
    return match?.[1] ?? null;
  };
  const cssName = assetName("href", "\\.css");
  const jsName = assetName("src", "\\.js");
  const css = cssName ? [cssName] : [];
  const js = jsName ? [jsName] : [];
  if (css.length > 0 || js.length > 0) {
    await fs.cp(path.join(webAssetsDir, "assets"), destDir, { recursive: true });
  }
  const href = (name: string) => joinSitePath(basePath, `assets/${name}`);
  return {
    css: css.map((name) => href(name)),
    js: js.map((name) => href(name)),
  };
}
