import { contextBridge, ipcRenderer } from "electron";
import type { DesktopApi } from "../shared/api";

function invoke<K extends keyof DesktopApi>(channel: K) {
  return ((...args: unknown[]) => ipcRenderer.invoke(channel, ...args)) as DesktopApi[K];
}

const api: DesktopApi = {
  pickFolder: invoke("pickFolder"),
  openFolder: invoke("openFolder"),
  getWorkspace: invoke("getWorkspace"),
  homeTree: invoke("homeTree"),
  openPage: invoke("openPage"),
  savePage: invoke("savePage"),
  patchFrontmatter: invoke("patchFrontmatter"),
  newPage: invoke("newPage"),
  newFolder: invoke("newFolder"),
  renamePage: invoke("renamePage"),
  deletePage: invoke("deletePage"),
  setDraftSelection: invoke("setDraftSelection"),
  previewReview: invoke("previewReview"),
  reviewBatch: invoke("reviewBatch"),
  publishBatch: invoke("publishBatch"),
  publishPersonal: invoke("publishPersonal"),
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
  onTheme: (listener) => {
    const wrapped = (_event: unknown, theme: "light" | "dark") => listener(theme);
    ipcRenderer.on("theme", wrapped);
    return () => {
      ipcRenderer.removeListener("theme", wrapped);
    };
  },
};

contextBridge.exposeInMainWorld("slashmd", api);
