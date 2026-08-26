import { app, BrowserWindow, dialog, nativeTheme } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFolderArg } from "../shared/cliArg";
import { registerIpc } from "./ipc";
import { resolveExistingFolder } from "./openFolder";
import { setWorkspaceRoot } from "./session";
import { applyWindowChrome, getTheme, resolveWindowTheme, themeColors } from "./themeStore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERER_DIST = path.join(__dirname, "../dist");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

function applyCliFolder(argv: string[], cwd = process.cwd()): void {
  const raw = parseFolderArg(argv);
  if (!raw) {
    return;
  }
  try {
    const folder = resolveExistingFolder(raw, cwd);
    setWorkspaceRoot(folder);
    mainWindow?.webContents.send("folder-opened", folder);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dialog.showErrorBox("Slash MD", message);
  }
}

function createWindow(): void {
  const windowTheme = resolveWindowTheme();
  const chrome = themeColors(windowTheme);
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    title: "Slash MD",
    show: false,
    backgroundColor: chrome.background,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 14, y: 14 },
    ...(process.platform !== "darwin"
      ? {
          titleBarOverlay: {
            color: chrome.background,
            symbolColor: chrome.symbol,
            height: 36,
          },
        }
      : {}),
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
    const osTheme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
    if (!getTheme() && mainWindow) {
      applyWindowChrome(mainWindow, osTheme);
    }
    mainWindow?.webContents.send("theme", osTheme);
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

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv, workingDirectory) => {
    applyCliFolder(argv, workingDirectory);
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  registerIpc(() => mainWindow);

  app.whenReady().then(() => {
    applyCliFolder(process.argv);
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
}
