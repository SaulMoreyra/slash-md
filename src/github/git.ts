import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";

const execFileAsync = promisify(execFile);

export class GitError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly stderr: string,
  ) {
    super(sanitize(message));
  }
}

export async function runGit(
  args: string[],
  opts: { cwd?: string; token?: string },
): Promise<string> {
  const git = vscode.workspace.getConfiguration("git").get<string>("path")?.trim() || "git";
  const env = gitEnv();
  const fullArgs = opts.token ? [...gitAuthArgs(opts.token), ...args] : args;

  try {
    const { stdout } = await execFileAsync(git, fullArgs, {
      cwd: opts.cwd,
      env,
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
    throw new GitError(sanitize(stderr || e.message || "git failed"), code, sanitize(stderr));
  }
}

export async function runGitBuffer(
  args: string[],
  opts: { cwd?: string; token?: string },
): Promise<Buffer> {
  const git = vscode.workspace.getConfiguration("git").get<string>("path")?.trim() || "git";
  const env = gitEnv();
  const fullArgs = opts.token ? [...gitAuthArgs(opts.token), ...args] : args;

  try {
    const { stdout } = await execFileAsync(git, fullArgs, {
      cwd: opts.cwd,
      env,
      encoding: "buffer",
      maxBuffer: 20 * 1024 * 1024,
    });
    return Buffer.from(stdout);
  } catch (err) {
    const e = err as { code?: number | string; stderr?: Buffer | string; message?: string };
    const stderr = Buffer.isBuffer(e.stderr) ? e.stderr.toString("utf8") : typeof e.stderr === "string" ? e.stderr : "";
    if (e.code === "ENOENT") {
      throw new GitError("Git was not found on PATH. Install Git and try again.", 127, "");
    }
    const code = typeof e.code === "number" ? e.code : 1;
    throw new GitError(sanitize(stderr || e.message || "git failed"), code, sanitize(stderr));
  }
}

function gitAuthArgs(token: string): string[] {
  const basic = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");
  return ["-c", "credential.helper=", "-c", `http.extraHeader=AUTHORIZATION: basic ${basic}`];
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

function sanitize(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .replace(/AUTHORIZATION:\s*basic\s+\S+/gi, "AUTHORIZATION: basic ***")
    .replace(/x-access-token:[^@\s]+/gi, "x-access-token:***");
}
