import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { AppTheme, DesktopApi } from "../shared/api";

function invoke<K extends keyof DesktopApi>(channel: K) {
  return ((...args: unknown[]) => ipcRenderer.invoke(channel, ...args)) as DesktopApi[K];
}

const api: DesktopApi = {
  pickFolder: invoke("pickFolder"),
  openFolder: invoke("openFolder"),
  closeFolder: invoke("closeFolder"),
  resolveDroppedFolder: async (file: File) => {
    const folderPath = webUtils.getPathForFile(file);
    return ipcRenderer.invoke("assertDirectory", folderPath) as Promise<string>;
  },
  assertDirectory: invoke("assertDirectory"),
  getWorkspace: invoke("getWorkspace"),
  homeTree: invoke("homeTree"),
  openPage: invoke("openPage"),
  savePage: invoke("savePage"),
  patchFrontmatter: invoke("patchFrontmatter"),
  newPage: invoke("newPage"),
  newFolder: invoke("newFolder"),
  renamePage: invoke("renamePage"),
  deletePage: invoke("deletePage"),
  renameFolder: invoke("renameFolder"),
  deleteFolder: invoke("deleteFolder"),
  discardDraft: invoke("discardDraft"),
  setDraftSelection: invoke("setDraftSelection"),
  previewReview: invoke("previewReview"),
  reviewBatch: invoke("reviewBatch"),
  publishBatch: invoke("publishBatch"),
  publishPersonal: invoke("publishPersonal"),
  createPublication: invoke("createPublication"),
  resumePublication: invoke("resumePublication"),
  leavePublication: invoke("leavePublication"),
  listPublications: invoke("listPublications"),
  getConflictState: invoke("getConflictState"),
  syncWithWiki: invoke("syncWithWiki"),
  resolveConflict: invoke("resolveConflict"),
  abortSyncWithWiki: invoke("abortSyncWithWiki"),
  finishSyncWithWiki: invoke("finishSyncWithWiki"),
  signIn: invoke("signIn"),
  signOut: invoke("signOut"),
  getConfig: invoke("getConfig"),
  saveConfig: invoke("saveConfig"),
  initWorkspace: invoke("initWorkspace"),
  listTemplates: invoke("listTemplates"),
  detectGit: invoke("detectGit"),
  uploadImage: invoke("uploadImage"),
  resolveImages: invoke("resolveImages"),
  loadThreads: invoke("loadThreads"),
  threadReply: invoke("threadReply"),
  threadResolve: invoke("threadResolve"),
  threadCreate: invoke("threadCreate"),
  openUrl: invoke("openUrl"),
  setTheme: invoke("setTheme"),
  onTheme: (listener) => {
    const wrapped = (_event: unknown, theme: "light" | "dark") => listener(theme);
    ipcRenderer.on("theme", wrapped);
    return () => {
      ipcRenderer.removeListener("theme", wrapped);
    };
  },
  onFolderOpened: (listener) => {
    const wrapped = (_event: unknown, folder: string) => listener(folder);
    ipcRenderer.on("folder-opened", wrapped);
    return () => {
      ipcRenderer.removeListener("folder-opened", wrapped);
    };
  },
};

contextBridge.exposeInMainWorld("slashmd", api);
contextBridge.exposeInMainWorld(
  "__SLASHMD_INITIAL_THEME__",
  ipcRenderer.sendSync("theme:getSync") as AppTheme | null,
);
