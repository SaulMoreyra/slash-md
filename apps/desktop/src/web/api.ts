import { splitFrontmatter } from "@slash-md/core/frontmatter";
import { referencedImages } from "@slash-md/core/images";
import { normalizeRepoMode } from "@slash-md/core/configTypes";
import { posixNormalize, posixJoin } from "@slash-md/core/paths";
import { joinSitePath, normalizeBasePath, stripContentPrefix } from "@slash-md/core/sitePages";
import type {
  AppTheme,
  DesktopApi,
  GitSnapshot,
  HomeTreePayload,
  PagePayload,
  WorkspaceInfo,
} from "../../shared/api";
import { getThemeSnapshot } from "../theme/theme";
import { getWebBoot, type WebHostBoot } from "../host";
import type { WebSiteManifest } from "./types";

export const THEME_KEY = "slash-md-theme";

const READ_ONLY = "La página es de solo lectura";

export function hrefForRoute(basePath: string, route: string): string {
  if (route === "/") {
    return normalizeBasePath(basePath) || "/";
  }
  return joinSitePath(basePath, route.replace(/^\//, ""));
}

export function createWebApi(): DesktopApi {
  const boot = getWebBoot();
  if (!boot) {
    throw new Error("Web host boot payload (window.__SLASH_MD__) not found.");
  }
  return new StaticWebApi(boot);
}

class StaticWebApi implements DesktopApi {
  private readonly manifestPromise: Promise<WebSiteManifest>;

  constructor(private readonly boot: WebHostBoot) {
    this.manifestPromise = fetch(this.boot.manifestUrl).then((res) => {
      if (!res.ok) {
        throw new Error(`No se pudo cargar el sitio (${res.status})`);
      }
      return res.json() as Promise<WebSiteManifest>;
    });
  }

  private async manifest(): Promise<WebSiteManifest> {
    return this.manifestPromise;
  }

  private async pageUrl(path: string): Promise<string> {
    const manifest = await this.manifest();
    const page = manifest.pages.find((p) => p.path === path);
    if (!page) {
      throw new Error(`Documento no encontrado: ${path}`);
    }
    return joinSitePath(manifest.basePath, page.content);
  }

  private fullTree(): Promise<HomeTreePayload> {
    return this.manifest().then((m) => ({
      repo: m.name,
      contentPath: m.contentPath,
      needsAuth: false,
      needsInit: false,
      fromWorkspace: true,
      roots: m.tree,
      drafts: [],
      selected: [],
      inbox: [],
      canPublishBatch: false,
      canWrite: false,
    }));
  }

  private async publishableMarkdown(path: string, markdown: string): Promise<PagePayload> {
    const { fields } = splitFrontmatter(markdown);
    return {
      path,
      markdown,
      frontmatter: fields,
      savedAt: null,
      pageKind: "wiki",
      repoMode: normalizeRepoMode("personal"),
      publishEnabled: false,
      reviewable: false,
      prUrl: null,
      publication: null,
      canWrite: false,
    };
  }

  async getWorkspace(): Promise<WorkspaceInfo> {
    const manifest = await this.manifest();
    return {
      root: "/",
      config: {
        repo: manifest.name,
        owner: "",
        name: manifest.name,
        contentPath: manifest.contentPath,
        defaultBranch: "main",
        mode: normalizeRepoMode("personal"),
      },
      slashmd: {
        repo: manifest.name,
        contentPath: manifest.contentPath,
        defaultBranch: "main",
        mode: normalizeRepoMode("personal"),
        site: { enabled: true, name: manifest.name, basePath: manifest.basePath },
      },
      needsInit: false,
      auth: null,
      theme: getThemeSnapshot(),
    };
  }

  async gitStatus(): Promise<GitSnapshot> {
    return { branch: null };
  }

  async homeTree(): Promise<HomeTreePayload> {
    return this.fullTree();
  }

  async openPage(path: string): Promise<PagePayload> {
    if (path !== this.boot.page) {
      const manifest = await this.manifest();
      const page = manifest.pages.find((p) => p.path === path);
      if (page) {
        window.location.href = hrefForRoute(manifest.basePath, page.route);
        return new Promise<PagePayload>(() => undefined);
      }
    }
    const res = await fetch(await this.pageUrl(path));
    if (!res.ok) {
      throw new Error(`Documento no encontrado: ${path}`);
    }
    return this.publishableMarkdown(path, await res.text());
  }

  async resolveImages(pagePath: string, markdown: string): Promise<Record<string, string>> {
    const manifest = await this.manifest();
    const map: Record<string, string> = {};
    for (const { src, repoPath } of referencedImages(markdown, pagePath)) {
      const rel = stripContentPrefix(repoPath, manifest.contentPath) || repoPath;
      const url = joinSitePath(manifest.basePath, posixJoin("content", rel));
      map[src] = url;
      map[src.replace(/^\.\//, "")] = url;
      map[posixNormalize(src)] = url;
    }
    return map;
  }

  async loadThreads(): Promise<{ threads: never[]; prUrl: null; canWrite: false; headOid: null }> {
    return { threads: [], prUrl: null, canWrite: false, headOid: null };
  }

  async listTemplates(): Promise<never[]> {
    return [];
  }

  async detectGit(): Promise<{ repo: undefined; branch: string; hasDocsDir: boolean }> {
    return { repo: undefined, branch: "main", hasDocsDir: true };
  }

  async probeGhAuth(): Promise<{ available: boolean; login: null }> {
    return { available: false, login: null };
  }

  async getConfig(): Promise<import("@slash-md/core/configTypes").SlashmdFile> {
    return (await this.getWorkspace()).slashmd;
  }

  async setTheme(theme: AppTheme): Promise<void> {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }

  onTheme(_listener: (theme: AppTheme) => void): () => void {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => _listener(media.matches ? "light" : "dark");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }

  async openUrl(url: string): Promise<void> {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  onFolderOpened(_listener: (folder: string) => void): () => void {
    return () => undefined;
  }

  onMenuAction(_listener: (action: import("../../shared/menu").MenuAction) => void): () => void {
    return () => undefined;
  }

  async pickFolder(): Promise<undefined> {
    return undefined;
  }

  async openFolder(_path: string): Promise<WorkspaceInfo> {
    return this.getWorkspace();
  }

  async closeFolder(): Promise<WorkspaceInfo> {
    return this.getWorkspace();
  }

  async assertDirectory(path: string): Promise<string> {
    return path;
  }

  async resolveDroppedFolder(_file: File): Promise<string> {
    throw new Error(READ_ONLY);
  }

  private writeOnly(): Promise<never> {
    return Promise.reject(new Error(READ_ONLY));
  }

  savePage(): Promise<never> {
    return this.writeOnly();
  }

  patchFrontmatter(): Promise<never> {
    return this.writeOnly();
  }

  newPage(): Promise<never> {
    return this.writeOnly();
  }

  newFolder(): Promise<never> {
    return this.writeOnly();
  }

  renamePage(): Promise<never> {
    return this.writeOnly();
  }

  deletePage(): Promise<never> {
    return this.writeOnly();
  }

  renameFolder(): Promise<never> {
    return this.writeOnly();
  }

  deleteFolder(): Promise<never> {
    return this.writeOnly();
  }

  discardDraft(): Promise<never> {
    return this.writeOnly();
  }

  setDraftSelection(): Promise<never> {
    return this.writeOnly();
  }

  previewReview(): Promise<never> {
    return this.writeOnly();
  }

  reviewBatch(): Promise<never> {
    return this.writeOnly();
  }

  publishBatch(): Promise<never> {
    return this.writeOnly();
  }

  publishPersonal(): Promise<never> {
    return this.writeOnly();
  }

  createPublication(): Promise<never> {
    return this.writeOnly();
  }

  resumePublication(): Promise<never> {
    return this.writeOnly();
  }

  leavePublication(): Promise<never> {
    return this.writeOnly();
  }

  landPublication(): Promise<never> {
    return this.writeOnly();
  }

  discardPublication(): Promise<never> {
    return this.writeOnly();
  }

  listPublications(): Promise<never> {
    return this.writeOnly();
  }

  getConflictState(): Promise<never> {
    return this.writeOnly();
  }

  syncWithWiki(): Promise<never> {
    return this.writeOnly();
  }

  resolveConflict(): Promise<never> {
    return this.writeOnly();
  }

  abortSyncWithWiki(): Promise<never> {
    return this.writeOnly();
  }

  finishSyncWithWiki(): Promise<never> {
    return this.writeOnly();
  }

  signIn(): Promise<never> {
    return this.writeOnly();
  }

  signOut(): Promise<never> {
    return this.writeOnly();
  }

  saveConfig(): Promise<never> {
    return this.writeOnly();
  }

  initWorkspace(): Promise<never> {
    return this.writeOnly();
  }

  uploadImage(): Promise<never> {
    return this.writeOnly();
  }

  threadReply(): Promise<never> {
    return this.writeOnly();
  }

  threadResolve(): Promise<never> {
    return this.writeOnly();
  }

  threadCreate(): Promise<never> {
    return this.writeOnly();
  }
}