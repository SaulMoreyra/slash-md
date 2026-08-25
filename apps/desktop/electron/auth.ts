import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getAuthenticatedLogin } from "@slash-md/github/comments";
import { readToken, writeToken } from "./session";

const execFileAsync = promisify(execFile);

export async function resolveToken(): Promise<string | undefined> {
  const stored = readToken()?.trim();
  if (stored) {
    return stored;
  }
  return readGhCliToken();
}

async function readGhCliToken(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("gh", ["auth", "token"], {
      encoding: "utf8",
      timeout: 8_000,
    });
    const token = stdout.trim();
    return token || undefined;
  } catch {
    return undefined;
  }
}

export async function signInWithToken(token?: string): Promise<{ login: string }> {
  const next = token?.trim() || (await readGhCliToken());
  if (!next) {
    throw new Error("Pega un GitHub token (repo) o inicia sesión con `gh auth login`.");
  }
  const login = await getAuthenticatedLogin(next);
  writeToken(next);
  return { login };
}

export function signOut(): void {
  writeToken(undefined);
}

export async function currentAuth(): Promise<{ login: string } | null> {
  const token = await resolveToken();
  if (!token) {
    return null;
  }
  try {
    const login = await getAuthenticatedLogin(token);
    return { login };
  } catch {
    return null;
  }
}
