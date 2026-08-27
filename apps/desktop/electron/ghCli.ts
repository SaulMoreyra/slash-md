import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ghSearchDirs, withGhSearchPath } from "../shared/ghPath";

const execFileAsync = promisify(execFile);
const GH_NAME = process.platform === "win32" ? "gh.exe" : "gh";

function ghEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: withGhSearchPath(process.env.PATH, os.homedir()) };
}

export async function resolveGhBinary(): Promise<string | undefined> {
  const env = ghEnv();
  try {
    await execFileAsync(GH_NAME, ["--version"], { env, timeout: 4_000 });
    return GH_NAME;
  } catch {
    // GUI apps often lack Homebrew on PATH; try well-known locations next.
  }
  for (const dir of ghSearchDirs(os.homedir())) {
    const candidate = path.join(dir, GH_NAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export async function readGhCliToken(): Promise<string | undefined> {
  const binary = await resolveGhBinary();
  if (!binary) {
    return undefined;
  }
  try {
    const { stdout } = await execFileAsync(binary, ["auth", "token"], {
      encoding: "utf8",
      timeout: 8_000,
      env: ghEnv(),
    });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}
