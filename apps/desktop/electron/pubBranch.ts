import { currentBranch, refExists, runGit, switchToBranch } from "./git";

export async function deleteLocalPubBranch(cwd: string, branch: string): Promise<void> {
  if (!(await refExists(cwd, `refs/heads/${branch}`))) {
    return;
  }
  try {
    await runGit(["branch", "-d", branch], { cwd });
  } catch {
    try {
      await runGit(["branch", "-D", branch], { cwd });
    } catch {
      // branch may already be gone
    }
  }
}

export async function landOnWiki(
  cwd: string,
  token: string | undefined,
  defaultBranch: string,
  pubBranch: string | undefined,
): Promise<void> {
  try {
    await runGit(["fetch", "origin", defaultBranch], { cwd, token });
  } catch {
    // still try switch + pull
  }
  const current = await currentBranch(cwd);
  if (current !== defaultBranch) {
    try {
      if (await refExists(cwd, `refs/heads/${defaultBranch}`)) {
        await switchToBranch(cwd, defaultBranch);
      } else if (await refExists(cwd, `refs/remotes/origin/${defaultBranch}`)) {
        await switchToBranch(cwd, defaultBranch);
      } else {
        throw new Error(`Branch ${defaultBranch} was not found.`);
      }
    } catch (err) {
      const from = pubBranch && current === pubBranch ? `review branch ${current}` : current;
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `PR merged, but could not switch from ${from} to ${defaultBranch} without overwriting local work. ${detail}`,
      );
    }
  }
  await runGit(["pull", "--ff-only", "origin", defaultBranch], { cwd, token });
  if (pubBranch) {
    await deleteLocalPubBranch(cwd, pubBranch);
  }
  try {
    await runGit(["fetch", "--prune", "origin"], { cwd, token });
  } catch {
    // tracking refs may stay until the next fetch
  }
}
