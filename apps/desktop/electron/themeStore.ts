import { app, BrowserWindow, nativeTheme } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { AppTheme } from "../shared/api";

const PREFERENCES_FILE = "preferences.json";

let cache: AppTheme | null | undefined;

export function parseAppTheme(value: unknown): AppTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

function preferencesPath(): string {
  return path.join(app.getPath("userData"), PREFERENCES_FILE);
}

function readFile(): AppTheme | null {
  try {
    const raw = fs.readFileSync(preferencesPath(), "utf8");
    const parsed = JSON.parse(raw) as { theme?: unknown };
    return parseAppTheme(parsed.theme);
  } catch {
    return null;
  }
}

export function getTheme(): AppTheme | null {
  if (cache !== undefined) {
    return cache;
  }
  cache = readFile();
  return cache;
}

export function setTheme(theme: AppTheme): void {
  cache = theme;
  try {
    const dir = app.getPath("userData");
    fs.mkdirSync(dir, { recursive: true });
    const target = preferencesPath();
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify({ theme }, null, 2)}\n`, "utf8");
    fs.renameSync(tmp, target);
  } catch {
    /* quota / permissions must not block the app */
  }
}

export function themeColors(theme: AppTheme): { background: string; symbol: string } {
  if (theme === "dark") {
    return { background: "#000000", symbol: "#ececec" };
  }
  return { background: "#f4f4f5", symbol: "#18181b" };
}

export function resolveWindowTheme(): AppTheme {
  return getTheme() ?? (nativeTheme.shouldUseDarkColors ? "dark" : "light");
}

export function applyWindowChrome(win: BrowserWindow, theme: AppTheme): void {
  const { background, symbol } = themeColors(theme);
  win.setBackgroundColor(background);
  if (process.platform !== "darwin") {
    win.setTitleBarOverlay({
      color: background,
      symbolColor: symbol,
      height: 36,
    });
  }
}
