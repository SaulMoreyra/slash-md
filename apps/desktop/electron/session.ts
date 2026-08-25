import fs from "node:fs";
import path from "node:path";
import { app, safeStorage } from "electron";

type Persisted = {
  workspaceRoot?: string;
  staging: Record<string, string[]>;
};

const empty: Persisted = { staging: {} };

function statePath(): string {
  return path.join(app.getPath("userData"), "desktop-state.json");
}

function tokenPath(): string {
  return path.join(app.getPath("userData"), "github-token.bin");
}

function readState(): Persisted {
  try {
    const raw = JSON.parse(fs.readFileSync(statePath(), "utf8")) as Persisted;
    return { workspaceRoot: raw.workspaceRoot, staging: raw.staging ?? {} };
  } catch {
    return { ...empty, staging: {} };
  }
}

function writeState(next: Persisted): void {
  fs.mkdirSync(path.dirname(statePath()), { recursive: true });
  fs.writeFileSync(statePath(), `${JSON.stringify(next, null, 2)}\n`);
}

export function getWorkspaceRoot(): string | null {
  const root = readState().workspaceRoot?.trim();
  if (!root || !fs.existsSync(root)) {
    return null;
  }
  return root;
}

export function setWorkspaceRoot(root: string | null): void {
  const state = readState();
  state.workspaceRoot = root ?? undefined;
  writeState(state);
}

export function readStaging(root: string): string[] {
  return readState().staging[root] ?? [];
}

export function writeStaging(root: string, paths: string[]): void {
  const state = readState();
  state.staging[root] = [...new Set(paths.filter(Boolean))];
  writeState(state);
}

export function readToken(): string | undefined {
  const env = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  if (env) {
    return env;
  }
  try {
    const buf = fs.readFileSync(tokenPath());
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buf);
    }
    return buf.toString("utf8");
  } catch {
    return undefined;
  }
}

export function writeToken(token: string | undefined): void {
  if (!token) {
    try {
      fs.unlinkSync(tokenPath());
    } catch {
      // none stored
    }
    return;
  }
  fs.mkdirSync(path.dirname(tokenPath()), { recursive: true });
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(tokenPath(), safeStorage.encryptString(token));
    return;
  }
  fs.writeFileSync(tokenPath(), token, "utf8");
}
