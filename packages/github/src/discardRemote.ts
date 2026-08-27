import { deleteBranch, GithubApiError, type GithubPull } from "./api";
import { closePull, openPull } from "./pullState";

export const DISCARD_REOPEN_FAILED =
  "The review was cancelled but could not be undone. The branch is still on GitHub.";

/**
 * Close the open PR (if any) then delete the remote `pub/…` branch.
 * If delete fails after a close, reopen the PR and leave local git alone.
 */
export async function discardGithubRemote(opts: {
  token: string;
  repo: { owner: string; name: string };
  branch: string;
  pull?: GithubPull;
}): Promise<void> {
  const { token, repo, branch, pull } = opts;
  if (pull) {
    if (pull.merged || pull.merged_at) {
      throw new GithubApiError("PR is not open", 422);
    }
    await closePull(token, repo, pull.number);
    try {
      await deleteBranch(token, repo, branch);
    } catch (err) {
      try {
        await openPull(token, repo, pull.number);
      } catch {
        throw new Error(DISCARD_REOPEN_FAILED);
      }
      throw err;
    }
    return;
  }
  await deleteBranch(token, repo, branch);
}
