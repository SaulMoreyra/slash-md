import { execFile } from "node:child_process";
import { promisify } from "node:util";

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

let gitBinary = "git";

export function setGitBinary(path: string | undefined): void {
  const trimmed = path?.trim();
  gitBinary = trimmed || "git";
}

export async function runGit(args: string[], opts: { cwd?: string; token?: string } = {}): Promise<string> {
  const env = gitEnv();
  const fullArgs = opts.token ? [...gitAuthArgs(opts.token), ...args] : args;

  try {
    const { stdout } = await execFileAsync(gitBinary, fullArgs, {
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

function gitAuthArgs(token: string): string[] {
  const basic = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");
  return ["-c", "credential.helper=", "-c", `http.extraHeader=AUTHORIZATION: basic ${basic}`];
}

function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" };
  delete env.GIT_ASKPASS;
  delete env.SSH_ASKPASS;
  return env;
}

function sanitize(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .replace(/AUTHORIZATION:\s*basic\s+\S+/gi, "AUTHORIZATION: basic ***")
    .replace(/x-access-token:[^@\s]+/gi, "x-access-token:***");
}

export async function isGitWorkspace(cwd: string): Promise<boolean> {
  try {
    return (await runGit(["rev-parse", "--is-inside-work-tree"], { cwd })).trim() === "true";
  } catch {
    return false;
  }
}

export async function refExists(cwd: string, ref: string): Promise<boolean> {
  try {
    await runGit(["show-ref", "--verify", "--quiet", ref], { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function currentBranch(cwd: string): Promise<string> {
  return (await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd })).trim();
}

export async function currentBranchName(cwd: string): Promise<string | undefined> {
  try {
    const name = await currentBranch(cwd);
    return name || undefined;
  } catch {
    return undefined;
  }
}

export async function isMergeInProgress(cwd: string): Promise<boolean> {
  try {
    await runGit(["rev-parse", "-q", "--verify", "MERGE_HEAD"], { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function forceSwitchToBranch(cwd: string, branch: string): Promise<void> {
  const current = await currentBranch(cwd);
  if (current === branch) {
    return;
  }
  if (await refExists(cwd, `refs/heads/${branch}`)) {
    await runGit(["switch", "-f", branch], { cwd });
    return;
  }
  if (await refExists(cwd, `refs/remotes/origin/${branch}`)) {
    await runGit(["switch", "-f", "--track", `origin/${branch}`], { cwd });
    return;
  }
  throw new Error(`Branch ${branch} was not found.`);
}

export async function switchToBranch(cwd: string, branch: string): Promise<void> {
  const current = await currentBranch(cwd);
  if (current === branch) {
    return;
  }
  try {
    if (await refExists(cwd, `refs/heads/${branch}`)) {
      await runGit(["switch", branch], { cwd });
      return;
    }
    if (await refExists(cwd, `refs/remotes/origin/${branch}`)) {
      await runGit(["switch", "--track", `origin/${branch}`], { cwd });
      return;
    }
    await runGit(["switch", "-c", branch], { cwd });
  } catch (err) {
    const detail = err instanceof GitError ? err.stderr || err.message : err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot switch to ${branch} without overwriting local work. Unselected dirty files were left untouched. ${detail}`.trim(),
    );
  }
}

export async function commitsAheadOf(cwd: string, branch: string, sha: string): Promise<number> {
  if (!sha) {
    return 0;
  }
  try {
    const out = (await runGit(["rev-list", "--count", `${sha}..refs/heads/${branch}`], { cwd })).trim();
    const count = Number(out);
    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

export type GitPathState = { untracked: boolean; dirty: boolean; deleted: boolean };

export function parsePorcelain(stdout: string): Map<string, GitPathState> {
  const map = new Map<string, GitPathState>();
  for (const line of stdout.split(/\r?\n/)) {
    if (!line) {
      continue;
    }
    const parsed = parsePorcelainLine(line);
    if (!parsed || parsed.xy === "!!") {
      continue;
    }
    if (parsed.xy === "??") {
      map.set(parsed.path, { untracked: true, dirty: true, deleted: false });
      continue;
    }
    const index = parsed.xy[0] ?? " ";
    const worktree = parsed.xy[1] ?? " ";
    const deleted = index === "D" || worktree === "D";
    map.set(parsed.path, {
      untracked: false,
      dirty: !deleted && (index !== " " || worktree !== " "),
      deleted,
    });
  }
  return map;
}

function parsePorcelainLine(line: string): { xy: string; path: string } | undefined {
  if (line.length < 4) {
    return undefined;
  }
  const xy = line.slice(0, 2);
  const rest = line.slice(3);
  const path = xy[0] === "R" || xy[0] === "C" ? renameDestination(rest) : unquoteGitPath(rest);
  const normalized = path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return undefined;
  }
  return { xy, path: normalized };
}

function renameDestination(rest: string): string {
  const sep = " -> ";
  const idx = rest.lastIndexOf(sep);
  return unquoteGitPath(idx < 0 ? rest : rest.slice(idx + sep.length));
}

function unquoteGitPath(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return value;
}
