#!/usr/bin/env node
/**
 * Dev-only: Electron.app still ships as “Electron”. Patch the local
 * bundle name + icon so the Dock matches SlashMD (packaged builds already do).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_NAME = "SlashMD";
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

if (process.platform !== "darwin") {
  process.exit(0);
}

const electronRoot = path.dirname(require.resolve("electron/package.json"));
const appRoot = path.join(electronRoot, "dist/Electron.app/Contents");
const infoPlist = path.join(appRoot, "Info.plist");
const destIcns = path.join(appRoot, "Resources/electron.icns");
const srcIcns = path.join(here, "../build/icon.icns");

if (!fs.existsSync(infoPlist)) {
  process.exit(0);
}

function setPlistString(key, value) {
  try {
    execFileSync("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${value}`, infoPlist], {
      stdio: "pipe",
    });
  } catch {
    execFileSync("/usr/libexec/PlistBuddy", ["-c", `Add :${key} string ${value}`, infoPlist], {
      stdio: "pipe",
    });
  }
}

setPlistString("CFBundleName", APP_NAME);
setPlistString("CFBundleDisplayName", APP_NAME);

if (fs.existsSync(srcIcns)) {
  fs.copyFileSync(srcIcns, destIcns);
}
