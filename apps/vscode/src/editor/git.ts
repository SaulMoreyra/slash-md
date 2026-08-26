import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class GitError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly stderr: string,
  ) {
    super(message);
  }
}

/** Override via setGitBinary (VS Code reads `git.path`). Default: `"git"`. */
let gitBinary = "git";

export function setGitBinary(path: string | undefined): void {
  const trimmed = path?.trim();
  gitBinary = trimmed || "git";
}

export async function runGit(args: string[], opts: { cwd?: string } = {}): Promise<string> {
  try {
    const { stdout } = await execFileAsync(gitBinary, args, {
      cwd: opts.cwd,
      env: gitEnv(),
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout;
  } catch (err) {
    const e = err as { code?: number | string; stderr?: string; message?: string };
    const stderr = typeof e.stderr === "string" ? e.stderr : "";
    if (e.code === "ENOENT") {
      throw new GitError("Git was not found on PATH. Install Git and try again.", 127, "");
    }
    const code = typeof e.code === "number" ? e.code : 1;
    throw new GitError(stderr || e.message || "git failed", code, stderr);
  }
}

function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };
  delete env.GIT_ASKPASS;
  delete env.SSH_ASKPASS;
  delete env.VSCODE_GIT_ASKPASS_NODE;
  delete env.VSCODE_GIT_ASKPASS_MAIN;
  delete env.VSCODE_GIT_ASKPASS_EXTRA_ARGS;
  delete env.VSCODE_GIT_IPC_HANDLE;
  return env;
}
