import { BrowserWindow, dialog, ipcMain, nativeTheme, shell } from "electron";
import type { DesktopApi, SlashmdFile, WorkspaceInfo } from "../shared/api";
import { currentAuth, signInWithToken, signOut } from "./auth";
import { detectGit, getContentConfig, readSlashmd, writeSlashmd } from "./config";
import { loadThreads, threadCreate, threadReply, threadResolve } from "./comments";
import { buildHomeTree } from "./home";
import { resolveImages, uploadImage } from "./images";
import {
  createFolder,
  createPage,
  deletePage,
  listTemplates,
  loadPage,
  patchFrontmatter,
  renamePage,
  savePage,
} from "./pages";
import { publishBatch, publishPersonal } from "./publish";
import { previewReview, sendBatchToReview } from "./review";
import { getWorkspaceRoot, setWorkspaceRoot, writeStaging } from "./session";

function theme(): "light" | "dark" {
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

  handle("pickFolder", async () => {
    const options = { title: "Open docs folder", properties: ["openDirectory" as const] };
    const win = getWindow();
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return result.canceled ? undefined : result.filePaths[0];
  });

  handle("openFolder", async (folderPath: string) => {
    setWorkspaceRoot(folderPath);
    return workspaceInfo();
  });

  handle("getWorkspace", () => workspaceInfo());

  handle("homeTree", () => buildHomeTree());

  handle("openPage", (pagePath: string) => loadPage(pagePath));

  handle("savePage", (pagePath: string, markdown: string) => savePage(pagePath, markdown));

  handle("patchFrontmatter", (pagePath: string, patch) => patchFrontmatter(pagePath, patch));

  handle("newPage", (input) => createPage(input));

  handle("newFolder", (input) => createFolder(input));

  handle("renamePage", (pagePath: string, title: string) => renamePage(pagePath, title));

  handle("deletePage", (pagePath: string) => deletePage(pagePath));

  handle("setDraftSelection", async (paths: string[]) => {
    const root = getWorkspaceRoot();
    if (root) {
      writeStaging(root, paths);
    }
  });

  handle("previewReview", () => previewReview());

  handle("reviewBatch", (reviewers?: string) => sendBatchToReview(reviewers));

  handle("publishBatch", (preferredPr?: number) => publishBatch(preferredPr));

  handle("publishPersonal", (pagePath: string) => publishPersonal(pagePath));

  handle("signIn", (token?: string) => signInWithToken(token));

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
}
