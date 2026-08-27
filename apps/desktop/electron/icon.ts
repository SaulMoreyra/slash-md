import { app, nativeImage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveAppIcon(): string | undefined {
  const candidates = [
    path.join(__dirname, "../build/icon.png"),
    path.join(app.getAppPath(), "build/icon.png"),
  ];
  return candidates.find((file) => fs.existsSync(file));
}

export function appIconImage(): Electron.NativeImage | undefined {
  const file = resolveAppIcon();
  if (!file) {
    return undefined;
  }
  const image = nativeImage.createFromPath(file);
  return image.isEmpty() ? undefined : image;
}
