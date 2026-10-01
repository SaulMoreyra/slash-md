import { app, type BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";

export function isSmokeRun(): boolean {
  return Boolean(process.env.SLASHMD_SMOKE_DIR?.trim());
}

export function applySmokeProfile(): void {
  const dir = process.env.SLASHMD_SMOKE_DIR?.trim();
  if (!dir) {
    return;
  }
  const profile = process.env.SLASHMD_SMOKE_PROFILE?.trim();
  if (profile) {
    app.setPath("userData", profile);
  }
}

function smokeLabel(): string {
  const raw = process.env.SLASHMD_SMOKE_LABEL?.trim() || "window";
  return raw.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "window";
}

export async function captureSmoke(win: BrowserWindow): Promise<void> {
  const dir = process.env.SLASHMD_SMOKE_DIR?.trim();
  if (!dir) {
    return;
  }
  const quit = process.env.SLASHMD_SMOKE_QUIT === "1";
  try {
    const waitMs = Number(process.env.SLASHMD_SMOKE_WAIT_MS ?? 2000);
    if (Number.isFinite(waitMs) && waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    const evalJs = process.env.SLASHMD_SMOKE_EVAL?.trim();
    if (evalJs) {
      const result = await win.webContents.executeJavaScript(evalJs);
      if (typeof result !== "undefined") {
        console.log(
          `[smoke-eval] ${typeof result === "string" ? result : JSON.stringify(result)}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    const png = await win.webContents.capturePage();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${smokeLabel()}.png`), png.toPNG());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[smoke] ${message}`);
    if (quit) {
      app.exit(1);
      return;
    }
  }
  if (quit) {
    app.quit();
  }
}
