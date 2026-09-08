import "./reader.css";
import { splitFrontmatter } from "@slash-md/core/frontmatter";
import { pageIcon } from "@slash-md/core/pageIcon";
import { isExternalHref, resolveRepoPath } from "@slash-md/core/paths";
import { joinSitePath, stripContentPrefix } from "@slash-md/core/sitePages";
import { flattenLibrary, rankLibraryHits } from "@slash-md/ui/home/utils/tree";
import { createSlashCrepe } from "@slash-md/ui/editor/core/crepe";
import { resolveInternalHref } from "./links";
import { bindSystemTheme, paintThemeToggle, toggleTheme } from "./theme";
import { escapeHtml, hrefForRoute, renderTree } from "./tree";
import type { SiteBoot, SiteManifest, SitePage } from "./types";

const boot = (window as unknown as Window & { __SLASH_MD__?: SiteBoot }).__SLASH_MD__;
const app = document.getElementById("app");

if (boot && app) {
  void bootReader(boot, app);
}

async function bootReader(boot: SiteBoot, app: HTMLElement): Promise<void> {
  let manifest: SiteManifest;
  try {
    manifest = (await (await fetch(boot.manifestUrl)).json()) as SiteManifest;
  } catch {
    app.textContent = "Failed to load docs.";
    return;
  }

  const page = manifest.pages.find((item) => item.path === boot.page);
  app.innerHTML = layoutHtml(manifest, boot.page);
  bindSearch(manifest);
  bindPaletteKeys();
  bindTheme();

  if (!page) {
    const canvas = app.querySelector(".reader-canvas");
    if (canvas) {
      canvas.innerHTML = `<p class="reader-missing">Page not found</p>`;
    }
    return;
  }

  const markdownRes = await fetch(joinSitePath(manifest.basePath, page.content));
  const markdown = markdownRes.ok ? await markdownRes.text() : "";
  if (!markdown) {
    const canvas = app.querySelector(".reader-canvas");
    if (canvas) {
      canvas.innerHTML = `<p class="reader-missing">Page not found</p>`;
    }
    return;
  }

  paintHero(app, markdown, page, manifest);
  const canvas = app.querySelector(".reader-canvas");
  if (!(canvas instanceof HTMLElement)) {
    return;
  }
  canvas.replaceChildren();
  const root = document.createElement("div");
  canvas.append(root);
  await createSlashCrepe({
    root,
    markdown,
    editable: false,
    proxyDomURL: (url) => proxyUrl(url, page.path, manifest),
  });
  canvas.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (!link) {
      return;
    }
    const href = link.getAttribute("href") ?? "";
    if (isExternalHref(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noreferrer");
      return;
    }
    const route = resolveInternalHref(page.path, href, manifest.pages);
    if (!route) {
      return;
    }
    event.preventDefault();
    window.location.href = hrefForRoute(manifest.basePath, route);
  });
}

function layoutHtml(manifest: SiteManifest, activePath: string): string {
  return `<div class="reader">
    <aside class="reader-tree">
      <p><strong>${escapeHtml(manifest.name)}</strong></p>
      <div class="reader-tree-actions">
        <button type="button" class="reader-search-btn" data-open-search>Search ⌘K</button>
        <button type="button" class="reader-theme-btn" data-toggle-theme>☾</button>
      </div>
      ${renderTree(manifest.tree, manifest.pages, manifest.basePath, activePath)}
    </aside>
    <div class="reader-main">
      <div class="reader-cover" hidden></div>
      <header class="reader-hero"></header>
      <div class="reader-canvas"></div>
    </div>
  </div>
  <div class="reader-palette" hidden>
    <div class="reader-palette-box">
      <input type="search" placeholder="Search pages" aria-label="Search pages" />
      <div class="reader-hits"></div>
    </div>
  </div>`;
}

function paintHero(app: HTMLElement, markdown: string, page: SitePage, manifest: SiteManifest): void {
  const { fields } = splitFrontmatter(markdown);
  const icon = pageIcon(markdown);
  const hero = app.querySelector(".reader-hero");
  if (hero) {
    hero.innerHTML = `${icon ? `<div class="reader-icon">${escapeHtml(icon)}</div>` : ""}<h1 class="reader-title">${escapeHtml(fields.title.trim() || page.title)}</h1>`;
  }
  const cover = app.querySelector(".reader-cover");
  if (cover instanceof HTMLElement && fields.cover.trim()) {
    const url = proxyUrl(fields.cover.trim(), page.path, manifest);
    cover.hidden = false;
    cover.style.backgroundImage = `url("${url}")`;
    if (fields.coverPosition.trim()) {
      cover.style.backgroundPosition = `center ${fields.coverPosition.trim()}`;
    }
  }
}

function proxyUrl(url: string, docPath: string, manifest: SiteManifest): string {
  if (!url || isExternalHref(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  const repo = resolveRepoPath(docPath, url) ?? url.replace(/^\.\//, "");
  const rel = stripContentPrefix(repo, manifest.contentPath) || repo;
  return joinSitePath(manifest.basePath, `content/${rel}`);
}

function bindSearch(manifest: SiteManifest): void {
  const palette = document.querySelector(".reader-palette");
  const input = palette?.querySelector("input");
  const hitsEl = palette?.querySelector(".reader-hits");
  const open = () => {
    if (palette instanceof HTMLElement) {
      palette.hidden = false;
      input?.focus();
    }
  };
  const close = () => {
    if (palette instanceof HTMLElement) {
      palette.hidden = true;
    }
  };
  document.querySelector("[data-open-search]")?.addEventListener("click", open);
  palette?.addEventListener("click", (event) => {
    if (event.target === palette) {
      close();
    }
  });
  input?.addEventListener("input", () => {
    if (!hitsEl || !(input instanceof HTMLInputElement)) {
      return;
    }
    const hits = rankLibraryHits(flattenLibrary(manifest.tree), input.value);
    hitsEl.innerHTML = hits
      .map((hit) => {
        const page = manifest.pages.find((item) => item.path === hit.path);
        if (!page) {
          return "";
        }
        const trail = hit.trail ? `<div class="reader-hit-trail">${escapeHtml(hit.trail)}</div>` : "";
        return `<a class="reader-hit" href="${hrefForRoute(manifest.basePath, page.route)}">${escapeHtml(hit.title)}${trail}</a>`;
      })
      .join("");
  });
}

function bindPaletteKeys(): void {
  window.addEventListener("keydown", (event) => {
    const palette = document.querySelector(".reader-palette");
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      document.querySelector<HTMLButtonElement>("[data-open-search]")?.click();
    }
    if (event.key === "Escape" && palette instanceof HTMLElement) {
      palette.hidden = true;
    }
  });
}

function bindTheme(): void {
  paintThemeToggle();
  bindSystemTheme();
  document.querySelector("[data-toggle-theme]")?.addEventListener("click", toggleTheme);
}
