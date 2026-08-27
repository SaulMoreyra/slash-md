import { getAuthenticatedLogin } from "@slash-md/github/comments";
import type { GhCliProbe } from "../shared/api";
import { readGhCliToken, resolveGhBinary } from "./ghCli";
import { readToken, writeToken } from "./session";

export async function resolveToken(): Promise<string | undefined> {
  const stored = readToken()?.trim();
  if (stored) {
    return stored;
  }
  return readGhCliToken();
}

export async function probeGhAuth(): Promise<GhCliProbe> {
  const binary = await resolveGhBinary();
  if (!binary) {
    return { available: false, login: null };
  }
  const token = await readGhCliToken();
  if (!token) {
    return { available: true, login: null };
  }
  try {
    const login = await getAuthenticatedLogin(token);
    return { available: true, login };
  } catch {
    return { available: true, login: null };
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
