import { BrowserWindow, ipcMain, nativeTheme, shell } from "electron";
import fs from "node:fs/promises";
import type { AppTheme, DesktopApi, SlashmdFile, WorkspaceInfo } from "../shared/api";
import { currentAuth, probeGhAuth, signInWithToken, signOut } from "./auth";
import { configuredSections, detectGit, getContentConfig, readSlashmd, writeSlashmd } from "./config";
import { buildSearchIndex, invalidateSearchIndex, listFolderLevel } from "./workspace";
import { loadThreads, threadCreate, threadReply, threadResolve } from "./comments";
import { buildHomeTree } from "./home";
import { resolveImages, uploadImage } from "./images";
import {
  createFolder,
  createPage,
  deleteFolder,
  deletePage,
  discardDraft,
  listTemplates,
  loadPage,
  patchFrontmatter,
  renameFolder,
  renamePage,
  savePage,
} from "./pages";
import { publishBatch, publishPersonal } from "./publish";
import { abortSyncWithWiki, finishSyncWithWiki, getConflictState, resolveConflict, syncWithWiki } from "./conflicts";
import { createPublication, discardPublication, landPublication, leavePublication, listPublications, resumePublication } from "./publication";
import { previewReview, sendBatchToReview } from "./review";
import { currentBranchName, isGitWorkspace } from "./git";
import { getWorkspaceRoot, setWorkspaceRoot, writeStaging } from "./session";
import { applyWindowChrome, getTheme, setTheme as persistTheme } from "./themeStore";
import { pickFolder } from "./folders";
import { abortAllChats, abortChat, listChatAgents, startChat } from "./agents";

function theme(): AppTheme {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
}

async function workspaceInfo(): Promise<WorkspaceInfo> {
  const root = getWorkspaceRoot();
  const slashmd = root ? await readSlashmd(root) : {};
  const config = await getContentConfig(root);
  return {
    root,
    config: config ?? null,
    slashmd,
    needsInit: !config,
    auth: await currentAuth(),
    theme: theme(),
  };
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message);
  });
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  const handle = <K extends keyof DesktopApi>(channel: K, fn: DesktopApi[K]) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, (_event, ...args: unknown[]) =>
      wrap(() => (fn as (...rest: unknown[]) => Promise<unknown>)(...args)),
    );
  };

  /**
   * Same as `handle`, for anything that can add, remove or retitle a page: it
   * drops the search index afterwards so the palette cannot serve stale hits.
   * Going through a named wrapper keeps that from being forgotten the next time
   * a write channel is added.
   */
  const handleWrite = <K extends keyof DesktopApi>(channel: K, fn: DesktopApi[K]) => {
    handle(channel, (async (...args: unknown[]) => {
      try {
        return await (fn as (...rest: unknown[]) => Promise<unknown>)(...args);
      } finally {
        invalidateSearchIndex();
      }
    }) as DesktopApi[K]);
  };

  handle("pickFolder", () => pickFolder(getWindow()));

  handle("openFolder", async (folderPath: string) => {
    abortAllChats();
    setWorkspaceRoot(folderPath);
    invalidateSearchIndex();
    return workspaceInfo();
  });

  handle("closeFolder", async () => {
    abortAllChats();
    setWorkspaceRoot(null);
    return workspaceInfo();
  });

  handle("assertDirectory", async (folderPath: string) => {
    const trimmed = folderPath?.trim();
    if (!trimmed) {
      throw new Error("No folder path.");
    }
    let stat;
    try {
      stat = await fs.stat(trimmed);
    } catch {
      throw new Error("That path does not exist.");
    }
    if (!stat.isDirectory()) {
      throw new Error("FOLDER_REQUIRED");
    }
    return trimmed;
  });

  handle("getWorkspace", () => workspaceInfo());

  handle("gitStatus", async () => {
    const root = getWorkspaceRoot();
    if (!root || !(await isGitWorkspace(root))) {
      return { branch: null };
    }
    return { branch: (await currentBranchName(root)) ?? null };
  });

  handle("homeTree", () => buildHomeTree());

  handle("listFolder", async (dirPath: string) => {
    const root = getWorkspaceRoot();
    if (!root) {
      return [];
    }
    const slashmd = await readSlashmd(root);
    const config = await getContentConfig(root);
    return listFolderLevel(root, dirPath, configuredSections(slashmd, config?.contentPath ?? "."));
  });

  handle("searchIndex", async () => {
    const root = getWorkspaceRoot();
    const config = await getContentConfig(root);
    if (!root || !config) {
      return [];
    }
    return buildSearchIndex(root, config.contentPath);
  });

  handle("openPage", (pagePath: string) => loadPage(pagePath));

  handleWrite("savePage", (pagePath: string, markdown: string) => savePage(pagePath, markdown));

  handleWrite("patchFrontmatter", (pagePath: string, patch) => patchFrontmatter(pagePath, patch));

  handleWrite("newPage", (input) => createPage(input));

  handleWrite("newFolder", (input) => createFolder(input));

  handleWrite("renamePage", (pagePath: string, title: string) => renamePage(pagePath, title));

  handleWrite("deletePage", (pagePath: string) => deletePage(pagePath));

  handleWrite("renameFolder", (folderPath: string, name: string) => renameFolder(folderPath, name));

  handleWrite("deleteFolder", (folderPath: string) => deleteFolder(folderPath));

  handleWrite("discardDraft", (pagePath: string) => discardDraft(pagePath));

  handle("setDraftSelection", async (paths: string[]) => {
    const root = getWorkspaceRoot();
    if (root) {
      writeStaging(root, paths);
    }
  });

  handle("previewReview", () => previewReview());

  handle("reviewBatch", (reviewers?: string, excludePaths?: string[]) => sendBatchToReview(reviewers, excludePaths));

  handle("publishBatch", (preferredPr?: number) => publishBatch(preferredPr));

  handle("publishPersonal", (paths: string | string[]) => publishPersonal(paths));

  handle("createPublication", (title: string) => createPublication(title));
  handle("resumePublication", (branch: string) => resumePublication(branch));
  handle("leavePublication", () => leavePublication());
  handle("landPublication", (branch?: string) => landPublication(branch));
  handle("discardPublication", (branch: string) => discardPublication(branch));
  handle("listPublications", () => listPublications());

  handle("getConflictState", () => getConflictState());
  handle("syncWithWiki", () => syncWithWiki());
  handle("resolveConflict", (pagePath: string, choice) => resolveConflict(pagePath, choice));
  handle("abortSyncWithWiki", () => abortSyncWithWiki());
  handle("finishSyncWithWiki", () => finishSyncWithWiki());

  handle("signIn", (token?: string) => signInWithToken(token));
  handle("probeGhAuth", () => probeGhAuth());

  handle("signOut", async () => {
    signOut();
  });

  handle("getConfig", async () => {
    const root = getWorkspaceRoot();
    if (!root) {
      return {};
    }
    return readSlashmd(root);
  });

  handle("saveConfig", async (config: SlashmdFile) => {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error("Abre una carpeta para guardar .slashmd.json.");
    }
    await writeSlashmd(root, config);
  });

  handle("initWorkspace", async (config: SlashmdFile) => {
    const root = getWorkspaceRoot();
    if (!root) {
      throw new Error("Abre una carpeta (the docs repo) to run Init.");
    }
    await writeSlashmd(root, config);
  });

  handle("listTemplates", () => listTemplates());

  handle("detectGit", async () => {
    const root = getWorkspaceRoot();
    if (!root) {
      return { branch: "main", hasDocsDir: false };
    }
    return detectGit(root);
  });

  handle("uploadImage", (pagePath: string, name: string, bytes: Uint8Array) => uploadImage(pagePath, name, bytes));

  handle("resolveImages", (pagePath: string, markdown: string) => resolveImages(pagePath, markdown));

  handle("loadThreads", (pagePath: string) => loadThreads(pagePath));

  handle("threadReply", (pagePath: string, threadId: string, body: string) => threadReply(pagePath, threadId, body));

  handle("threadResolve", (pagePath: string, threadId: string, resolved: boolean) =>
    threadResolve(pagePath, threadId, resolved),
  );

  handle("threadCreate", (pagePath: string, selectedText: string, body: string) =>
    threadCreate(pagePath, selectedText, body),
  );

  handle("openUrl", async (url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.removeAllListeners("theme:getSync");
  ipcMain.on("theme:getSync", (event) => {
    event.returnValue = getTheme();
  });

  handle("setTheme", async (next: AppTheme) => {
    persistTheme(next);
    const win = getWindow();
    if (win) {
      applyWindowChrome(win, next);
    }
  });

  handle("chatListAgents", () => listChatAgents());

  handle("chatSend", (request) =>
    startChat(request, (message) => {
      const win = getWindow();
      if (win) {
        win.webContents.send("chat-event", message);
      }
    }),
  );

  handle("chatAbort", async (sessionId: string) => {
    abortChat(sessionId);
  });
}
