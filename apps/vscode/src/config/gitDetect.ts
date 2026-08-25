import * as vscode from "vscode";

export function parseGithubRepo(remoteUrl: string): string | undefined {
  const cleaned = remoteUrl.trim().replace(/\.git$/i, "");
  const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/\s]+)$/i);
  if (!match) {
    return undefined;
  }
  return `${match[1]}/${match[2]}`;
}

export async function detectWorkspaceGit(folder: vscode.Uri): Promise<{ repo?: string; branch: string }> {
  const origin = await readGitOrigin(folder);
  const branch = (await readGitBranch(folder)) ?? "main";
  return { repo: origin ? parseGithubRepo(origin) : undefined, branch };
}

async function readGitOrigin(folder: vscode.Uri): Promise<string | undefined> {
  try {
    const raw = Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder, ".git", "config"))).toString(
      "utf8",
    );
    const block = raw.match(/\[remote "origin"\]([\s\S]*?)(?:\[|$)/);
    const url = block?.[1]?.match(/url\s*=\s*(.+)/)?.[1]?.trim();
    return url;
  } catch {
    return undefined;
  }
}

async function readGitBranch(folder: vscode.Uri): Promise<string | undefined> {
  try {
    const raw = Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder, ".git", "HEAD"))).toString(
      "utf8",
    );
    const ref = raw.match(/^ref:\s*refs\/heads\/(.+)$/m);
    return ref?.[1]?.trim();
  } catch {
    return undefined;
  }
}

export async function folderHasDocsDir(folder: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder, "docs"));
    return (stat.type & vscode.FileType.Directory) !== 0;
  } catch {
    return false;
  }
}
