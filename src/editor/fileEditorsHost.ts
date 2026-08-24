import * as os from "node:os";
import * as vscode from "vscode";
import { runGit } from "../github/git";
import {
  buildEditorsPayload,
  parseGitAuthorLog,
  type LocalIdentity,
} from "../domain/fileEditors";
import type { FileEditorsPayload, HostToWebview } from "../domain/protocol";
import { relativePosix } from "../workspace/docsWorkspace";

const LOG_LIMIT = 200;

export async function pushFileEditors(
  document: vscode.TextDocument,
  webview: vscode.Webview,
): Promise<void> {
  const payload = await loadFileEditors(document);
  await webview.postMessage({ type: "editors", ...payload } satisfies HostToWebview);
}

export async function loadFileEditors(document: vscode.TextDocument): Promise<FileEditorsPayload> {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  const fallbackAt = await fileMtime(document.uri);
  if (!folder) {
    return buildEditorsPayload({ commits: [], fallbackAt });
  }

  const cwd = await gitToplevel(folder.uri.fsPath) ?? folder.uri.fsPath;
  const rel =
    relativeFromCwd(cwd, document.uri.fsPath) ||
    relativePosix(folder.uri, document.uri);
  if (!rel) {
    return buildEditorsPayload({ commits: [], fallbackAt });
  }

  const you = await readLocalIdentity(cwd);
  const dirty = await isDirty(cwd, rel);
  const log = await gitString(cwd, [
    "log",
    "--follow",
    "-n",
    String(LOG_LIMIT),
    "--pretty=format:%aN%x1f%aE%x1f%aI",
    "--",
    rel,
  ]);
  const commits = parseGitAuthorLog(log ?? "");
  return buildEditorsPayload({
    commits,
    you,
    dirty,
    at: dirty ? new Date().toISOString() : undefined,
    fallbackAt,
  });
}

async function readLocalIdentity(cwd: string): Promise<LocalIdentity | null> {
  const name = (await gitString(cwd, ["config", "--get", "user.name"])) || "";
  const email = (await gitString(cwd, ["config", "--get", "user.email"])) || "";
  let login: string | null = null;
  try {
    const session = await vscode.authentication.getSession("github", ["repo"], { silent: true });
    login = session?.account.label?.trim() || null;
  } catch {
    login = null;
  }
  let fallback = "";
  try {
    fallback = os.userInfo().username || "";
  } catch {
    fallback = "";
  }
  if (!name && !email && !login && !fallback) {
    return null;
  }
  return {
    name: name || login || fallback || "You",
    email,
    login,
  };
}

async function isDirty(cwd: string, rel: string): Promise<boolean> {
  const status = await gitString(cwd, ["status", "--porcelain", "--", rel]);
  return Boolean(status);
}

async function gitToplevel(cwd: string): Promise<string | undefined> {
  return gitString(cwd, ["rev-parse", "--show-toplevel"]);
}

async function gitString(cwd: string, args: string[]): Promise<string | undefined> {
  try {
    const out = (await runGit(args, { cwd })).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

function relativeFromCwd(cwd: string, filePath: string): string | undefined {
  const base = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
  const full = filePath.replace(/\\/g, "/");
  if (full === base) {
    return undefined;
  }
  const prefix = `${base}/`;
  if (full.startsWith(prefix)) {
    return full.slice(prefix.length);
  }
  if (full.toLowerCase().startsWith(prefix.toLowerCase())) {
    return full.slice(prefix.length);
  }
  return undefined;
}

async function fileMtime(uri: vscode.Uri): Promise<string | null> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return new Date(stat.mtime).toISOString();
  } catch {
    return null;
  }
}
