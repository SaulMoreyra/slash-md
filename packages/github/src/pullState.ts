import { GithubApiError, getPull, githubRequest, type GithubPull } from "./api";

function pullPath(repo: { owner: string; name: string }, number: number): string {
  return `/repos/${repo.owner}/${repo.name}/pulls/${number}`;
}

function assertNotMerged(pull: GithubPull): void {
  if (pull.merged || pull.merged_at) {
    throw new GithubApiError("PR is not open", 422);
  }
}

export async function closePull(
  token: string,
  repo: { owner: string; name: string },
  number: number,
): Promise<GithubPull> {
  const current = await getPull(token, repo, number);
  assertNotMerged(current);
  if (current.state === "closed") {
    return current;
  }
  return githubRequest<GithubPull>(token, "PATCH", pullPath(repo, number), { state: "closed" });
}

export async function openPull(
  token: string,
  repo: { owner: string; name: string },
  number: number,
): Promise<GithubPull> {
  const current = await getPull(token, repo, number);
  assertNotMerged(current);
  if (current.state === "open") {
    return current;
  }
  return githubRequest<GithubPull>(token, "PATCH", pullPath(repo, number), { state: "open" });
}
