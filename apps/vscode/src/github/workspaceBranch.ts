import { runGit } from "./git";

/** Current branch name of the docs workspace, or undefined if not a git checkout. */
export async function readWorkspaceHeadBranch(cwd: string): Promise<string | undefined> {
  try {
    const name = (await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd })).trim();
    if (!name || name === "HEAD") {
      return undefined;
    }
    return name;
  } catch {
    return undefined;
  }
}
