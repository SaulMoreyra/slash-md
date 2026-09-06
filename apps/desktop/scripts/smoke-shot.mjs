#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(here, "..");
const repo = path.resolve(desktop, "../..");
const electronBin = require("electron");
const outDir = path.join(repo, ".tmp/smoke");
const profile = path.join(repo, ".tmp/smoke-profile");
const viteUrl = "http://127.0.0.1:5173";
const fixtureHome = path.join(repo, "fixtures/smoke-workspace");

function parseArgs(argv) {
  let label = "";
  let wait = "";
  let evalJs = "";
  let surface = "";
  let folder = "";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      folder = argv.slice(i + 1).find((item) => item && !item.startsWith("-")) ?? "";
      break;
    }
    if (arg.startsWith("--label=")) {
      label = arg.slice("--label=".length);
    } else if (arg === "--label") {
      label = argv[(i += 1)] ?? "";
    } else if (arg.startsWith("--wait=")) {
      wait = arg.slice("--wait=".length);
    } else if (arg === "--wait") {
      wait = argv[(i += 1)] ?? "";
    } else if (arg.startsWith("--eval=")) {
      evalJs = arg.slice("--eval=".length);
    } else if (arg === "--eval") {
      evalJs = argv[(i += 1)] ?? "";
    } else if (arg.startsWith("--surface=")) {
      surface = arg.slice("--surface=".length);
    } else if (arg === "--surface") {
      surface = argv[(i += 1)] ?? "";
    }
  }
  if (surface === "home" && !folder) {
    folder = fixtureHome;
  }
  if (!label) {
    label = folder ? "home" : "welcome";
  }
  return { label, wait, evalJs, folder };
}

async function viteReady() {
  try {
    const res = await fetch(viteUrl, { signal: AbortSignal.timeout(800) });
    return res.ok;
  } catch {
    return false;
  }
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function waitForFile(filePath, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (exists(filePath) && fs.statSync(filePath).size > 0) {
        resolve(filePath);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Timed out waiting for ${filePath}`));
        return;
      }
      setTimeout(tick, 80);
    };
    tick();
  });
}

const opts = parseArgs(process.argv.slice(2));
const mainJs = path.join(desktop, "dist-electron/main.js");
const distHtml = path.join(desktop, "dist/index.html");
const viteUp = await viteReady();

if (!exists(mainJs)) {
  console.error("Missing apps/desktop/dist-electron/main.js. Run `npm run desktop:dev` first.");
  process.exit(1);
}
if (!viteUp && !exists(distHtml)) {
  console.error("Vite is not running on :5173 and dist/ is missing. Run `npm run desktop:dev` first.");
  process.exit(1);
}

fs.rmSync(profile, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const png = path.join(outDir, `${opts.label.replace(/[^a-zA-Z0-9._-]+/g, "-") || "window"}.png`);
if (exists(png)) {
  fs.unlinkSync(png);
}

const env = {
  ...process.env,
  SLASHMD_SMOKE_DIR: outDir,
  SLASHMD_SMOKE_PROFILE: profile,
  SLASHMD_SMOKE_LABEL: opts.label,
  SLASHMD_SMOKE_QUIT: "1",
};
if (opts.wait) {
  env.SLASHMD_SMOKE_WAIT_MS = opts.wait;
}
if (opts.evalJs) {
  env.SLASHMD_SMOKE_EVAL = opts.evalJs;
}
if (viteUp) {
  env.VITE_DEV_SERVER_URL = viteUrl;
}

const electronArgs = ["."];
if (opts.folder) {
  electronArgs.push("--", path.resolve(process.cwd(), opts.folder));
}

const child = spawn(electronBin, electronArgs, {
  cwd: desktop,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  await waitForFile(png, 45_000);
  child.kill();
  console.log(`SMOKE_PNG=${png}`);
} catch (err) {
  child.kill();
  const message = err instanceof Error ? err.message : String(err);
  if (stderr.trim()) {
    console.error(stderr.trim());
  }
  console.error(message);
  process.exit(1);
}
