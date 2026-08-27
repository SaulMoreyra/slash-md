import { BrowserWindow, dialog } from "electron";
import { APP_NAME } from "../shared/brand";
import { setWorkspaceRoot } from "./session";

export async function pickFolder(win: BrowserWindow | null): Promise<string | undefined> {
  const options = { title: APP_NAME, properties: ["openDirectory" as const] };
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  return result.canceled ? undefined : result.filePaths[0];
}

export function notifyFolderOpened(win: BrowserWindow | null, folder: string | null): void {
  win?.webContents.send("folder-opened", folder ?? "");
}

export async function pickAndOpenFolder(win: BrowserWindow | null): Promise<string | undefined> {
  const folder = await pickFolder(win);
  if (!folder) {
    return;
  }
  setWorkspaceRoot(folder);
  notifyFolderOpened(win, folder);
  return folder;
}

export function closeOpenFolder(win: BrowserWindow | null): void {
  setWorkspaceRoot(null);
  notifyFolderOpened(win, null);
}
