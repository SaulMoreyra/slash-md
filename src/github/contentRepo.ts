import * as vscode from "vscode";
import { ContentConfig, githubHttpsUrl } from "./config";
import { GitError, runGit, runGitBuffer } from "./git";

export class ContentRepo {
  constructor(private readonly context: vscode.ExtensionContext) {}

  cloneDir(config: ContentConfig): vscode.Uri {
    return vscode.Uri.joinPath(this.context.globalStorageUri, "repos", config.owner, config.name);
  }

  async ensureFetched(config: ContentConfig, token: string): Promise<void> {
    const dest = this.cloneDir(config);
    const destPath = dest.fsPath;
    if (await this.hasGitDir(dest)) {
      await runGit(["fetch", "origin", config.defaultBranch], { cwd: destPath, token });
      return;
    }
    if (await this.exists(dest)) {
      await vscode.workspace.fs.delete(dest, { recursive: true, useTrash: false });
    }
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(this.context.globalStorageUri, "repos", config.owner));
    await runGit(
      ["clone", "--origin", "origin", githubHttpsUrl(config.owner, config.name), destPath],
      { token },
    );
  }

  worktreeDir(config: ContentConfig, branch: string): vscode.Uri {
    return vscode.Uri.joinPath(this.context.globalStorageUri, "worktrees", config.owner, config.name, ...branch.split("/"));
  }

  async ensureReviewWorktree(config: ContentConfig, token: string, branch: string): Promise<string> {
    await this.ensureFetched(config, token);
    const clone = this.cloneDir(config).fsPath;
    await runGit(["worktree", "prune"], { cwd: clone });

    const already = await this.worktreePathForBranch(clone, branch);
    if (already) {
      await this.fastForwardWorktree(already, branch, token);
      return already;
    }

    try {
      await runGit(["fetch", "origin", branch], { cwd: clone, token });
    } catch {
      // Branch may not exist on the remote yet.
    }

    const dest = this.worktreeDir(config, branch);
    if (await this.exists(dest)) {
      await vscode.workspace.fs.delete(dest, { recursive: true, useTrash: false });
    }
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(dest, ".."));

    const destPath = dest.fsPath;
    const hasLocal = await this.refExists(clone, `refs/heads/${branch}`);
    const hasRemote = await this.refExists(clone, `refs/remotes/origin/${branch}`);
    if (hasLocal) {
      await runGit(["worktree", "add", destPath, branch], { cwd: clone });
    } else if (hasRemote) {
      await runGit(["worktree", "add", "-b", branch, destPath, `origin/${branch}`], { cwd: clone });
    } else {
      await runGit(["worktree", "add", "-b", branch, destPath, `origin/${config.defaultBranch}`], { cwd: clone });
    }
    return destPath;
  }

  async removeReviewWorktree(config: ContentConfig, branch: string): Promise<void> {
    const clone = this.cloneDir(config).fsPath;
    try {
      const existing = await this.worktreePathForBranch(clone, branch);
      if (existing) {
        await runGit(["worktree", "remove", "--force", existing], { cwd: clone });
      }
    } catch {
      // Publish already succeeded; leftover worktree is harmless.
    }
    try {
      await runGit(["branch", "-D", branch], { cwd: clone });
    } catch {
      // Remote delete is what matters.
    }
  }

  private async fastForwardWorktree(wt: string, branch: string, token: string): Promise<void> {
    try {
      await runGit(["fetch", "origin", branch], { cwd: wt, token });
      await runGit(["merge", "--ff-only", `origin/${branch}`], { cwd: wt });
    } catch {
      // First push has no origin/branch yet, or already up to date.
    }
  }

  private async worktreePathForBranch(clone: string, branch: string): Promise<string | undefined> {
    const raw = await runGit(["worktree", "list", "--porcelain"], { cwd: clone });
    const blocks = raw.split("\n\n");
    const wanted = `refs/heads/${branch}`;
    for (const block of blocks) {
      const pathLine = block.match(/^worktree (.+)$/m)?.[1]?.trim();
      const branchLine = block.match(/^branch (.+)$/m)?.[1]?.trim();
      if (pathLine && branchLine === wanted) {
        return pathLine;
      }
    }
    return undefined;
  }

  private async refExists(cwd: string, ref: string): Promise<boolean> {
    try {
      await runGit(["show-ref", "--verify", "--quiet", ref], { cwd });
      return true;
    } catch {
      return false;
    }
  }

  async listMarkdown(config: ContentConfig, token: string): Promise<string[]> {
    await this.ensureFetched(config, token);
    const ref = `origin/${config.defaultBranch}`;
    const args = ["ls-tree", "-r", "--name-only", "--full-name", ref];
    if (config.contentPath) {
      args.push("--", config.contentPath);
    }
    let stdout: string;
    try {
      stdout = await runGit(args, {
        cwd: this.cloneDir(config).fsPath,
      });
    } catch (err) {
      if (err instanceof GitError && /not exist|does not exist|Not a valid object|exists on disk, but not in/i.test(err.message)) {
        return [];
      }
      throw err;
    }
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((path) => path.endsWith(".md") && !path.endsWith(".slash.md"));
  }

  async listDirs(config: ContentConfig, token: string): Promise<string[]> {
    const files = await this.listMarkdown(config, token);
    const dirs = new Set<string>();
    if (config.contentPath) {
      dirs.add(config.contentPath);
    }
    for (const file of files) {
      const parts = file.split("/").filter(Boolean);
      for (let i = 1; i < parts.length; i += 1) {
        dirs.add(parts.slice(0, i).join("/"));
      }
    }
    return [...dirs].sort();
  }

  async readBlob(config: ContentConfig, repoPath: string): Promise<Uint8Array> {
    return runGitBuffer(["show", `origin/${config.defaultBranch}:${repoPath}`], {
      cwd: this.cloneDir(config).fsPath,
    });
  }

  async readFile(config: ContentConfig, repoPath: string): Promise<string> {
    return runGit(["show", `origin/${config.defaultBranch}:${repoPath}`], {
      cwd: this.cloneDir(config).fsPath,
    });
  }

  async headOid(config: ContentConfig): Promise<string> {
    return (
      await runGit(["rev-parse", `origin/${config.defaultBranch}`], {
        cwd: this.cloneDir(config).fsPath,
      })
    ).trim();
  }

  private async exists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  private async hasGitDir(dest: vscode.Uri): Promise<boolean> {
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.joinPath(dest, ".git"));
      return (stat.type & vscode.FileType.Directory) !== 0 || (stat.type & vscode.FileType.File) !== 0;
    } catch {
      return false;
    }
  }
}
