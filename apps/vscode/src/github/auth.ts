import * as vscode from "vscode";

const SCOPES = ["repo"];

export async function getGithubSession(): Promise<vscode.AuthenticationSession | undefined> {
  try {
    const existing = await vscode.authentication.getSession("github", SCOPES, { silent: true });
    if (existing) {
      return existing;
    }
  } catch {
    // silent is unsupported or no session; prompt once below
  }

  try {
    return await vscode.authentication.getSession("github", SCOPES, { createIfNone: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/not available|could not be found/i.test(message)) {
      throw new Error("No GitHub provider. Open Cursor/VS Code with GitHub Authentication and try again.");
    }
    throw err;
  }
}

export async function getGithubToken(): Promise<string | undefined> {
  return (await getGithubSession())?.accessToken;
}
