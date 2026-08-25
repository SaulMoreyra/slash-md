import { app, BrowserWindow, nativeTheme } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpc } from "./ipc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERER_DIST = path.join(__dirname, "../dist");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    title: "Slash MD",
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#191919" : "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  nativeTheme.on("updated", () => {
    mainWindow?.webContents.send("theme", nativeTheme.shouldUseDarkColors ? "dark" : "light");
  });

  if (VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.send("theme", nativeTheme.shouldUseDarkColors ? "dark" : "light");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

registerIpc(() => mainWindow);

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

