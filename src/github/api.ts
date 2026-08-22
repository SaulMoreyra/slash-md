export class GithubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type GithubUser = { login: string };
export type GithubTeam = { name: string; slug: string };

export type GithubPull = {
  number: number;
  html_url: string;
  title: string;
  state: "open" | "closed";
  merged?: boolean;
  merged_at: string | null;
  mergeable?: boolean | null;
  mergeable_state?: string;
  user?: GithubUser;
  head: { sha: string; ref: string };
  requested_reviewers?: GithubUser[];
  requested_teams?: GithubTeam[];
};

export type GithubReview = {
  state: string;
  user: GithubUser | null;
};

export async function githubRequest<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "slash-md",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new GithubApiError("GitHub did not respond in time.", 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let json: unknown;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = undefined;
    }
  }
  if (!res.ok) {
    const fromBody =
      json && typeof json === "object" && "message" in json && typeof json.message === "string"
        ? json.message
        : undefined;
    const extras =
      json && typeof json === "object" && "errors" in json && Array.isArray(json.errors)
        ? json.errors
            .map((item) =>
              item && typeof item === "object" && "message" in item && typeof item.message === "string"
                ? item.message
                : undefined,
            )
            .filter((item): item is string => Boolean(item))
            .join("; ")
        : "";
    throw new GithubApiError([fromBody, extras].filter(Boolean).join(" — ") || text || res.statusText, res.status);
  }
  return json as T;
}

export async function createPullRequest(
  token: string,
  repo: { owner: string; name: string },
  input: { title: string; head: string; base: string; body: string },
): Promise<GithubPull> {
  try {
    return await githubRequest<GithubPull>(token, "POST", `/repos/${repo.owner}/${repo.name}/pulls`, input);
  } catch (err) {
    if (err instanceof GithubApiError && err.status === 422) {
      const existing = await findOpenPull(token, repo, input.head);
      if (existing) {
        return existing;
      }
    }
    throw err;
  }
}

export async function findOpenPull(
  token: string,
  repo: { owner: string; name: string },
  branch: string,
): Promise<GithubPull | undefined> {
  const params = new URLSearchParams({ head: `${repo.owner}:${branch}`, state: "open" });
  const pulls = await githubRequest<GithubPull[]>(
    token,
    "GET",
    `/repos/${repo.owner}/${repo.name}/pulls?${params.toString()}`,
  );
  return pulls[0];
}

export async function getPull(
  token: string,
  repo: { owner: string; name: string },
  number: number,
): Promise<GithubPull> {
  return githubRequest<GithubPull>(token, "GET", `/repos/${repo.owner}/${repo.name}/pulls/${number}`);
}

export async function listPullReviews(
  token: string,
  repo: { owner: string; name: string },
  number: number,
): Promise<GithubReview[]> {
  return githubRequest<GithubReview[]>(token, "GET", `/repos/${repo.owner}/${repo.name}/pulls/${number}/reviews`);
}

export type CombinedStatus = {
  state: "success" | "pending" | "failure" | "error";
  total_count: number;
};

export async function getCombinedStatus(
  token: string,
  repo: { owner: string; name: string },
  sha: string,
): Promise<CombinedStatus> {
  return githubRequest<CombinedStatus>(token, "GET", `/repos/${repo.owner}/${repo.name}/commits/${sha}/status`);
}

export type CheckRun = {
  status: string;
  conclusion: string | null;
  name: string;
};

export async function listCheckRuns(
  token: string,
  repo: { owner: string; name: string },
  sha: string,
): Promise<CheckRun[]> {
  const data = await githubRequest<{ check_runs: CheckRun[] }>(
    token,
    "GET",
    `/repos/${repo.owner}/${repo.name}/commits/${sha}/check-runs?per_page=100`,
  );
  return data.check_runs ?? [];
}

export type RepoMergeSettings = {
  allow_merge_commit: boolean;
  allow_squash_merge: boolean;
  allow_rebase_merge: boolean;
  delete_branch_on_merge: boolean;
};

export async function getRepoMergeSettings(
  token: string,
  repo: { owner: string; name: string },
): Promise<RepoMergeSettings> {
  return githubRequest<RepoMergeSettings>(token, "GET", `/repos/${repo.owner}/${repo.name}`);
}

export type MergeMethod = "merge" | "squash" | "rebase";

export async function mergePull(
  token: string,
  repo: { owner: string; name: string },
  number: number,
  input: { sha: string; merge_method: MergeMethod; commit_title?: string },
): Promise<{ merged: boolean; sha: string }> {
  return githubRequest(token, "PUT", `/repos/${repo.owner}/${repo.name}/pulls/${number}/merge`, input);
}

export async function deleteBranch(
  token: string,
  repo: { owner: string; name: string },
  branch: string,
): Promise<void> {
  try {
    await githubRequest(token, "DELETE", `/repos/${repo.owner}/${repo.name}/git/refs/heads/${branch}`);
  } catch (err) {
    if (err instanceof GithubApiError && (err.status === 404 || err.status === 422)) {
      return;
    }
    throw err;
  }
}

export function reviewBarLabel(pr: GithubPull, reviews: GithubReview[]): string {
  const waiting = [
    ...(pr.requested_reviewers ?? []).map((user) => `@${user.login}`),
    ...(pr.requested_teams ?? []).map((team) => `@${team.slug}`),
  ];
  const latestByUser = new Map<string, string>();
  for (const review of reviews) {
    const login = review.user?.login;
    if (!login || review.state === "PENDING" || review.state === "COMMENTED") {
      continue;
    }
    latestByUser.set(login, review.state);
  }
  const states = [...latestByUser.values()];
  if (states.includes("CHANGES_REQUESTED")) {
    return `in review #${pr.number} · changes requested`;
  }
  if (states.length > 0 && states.every((state) => state === "APPROVED") && waiting.length === 0) {
    return `in review #${pr.number} · approved`;
  }
  if (waiting.length > 0) {
    return `in review #${pr.number} · waiting on ${waiting.join(", ")}`;
  }
  return `in review #${pr.number}`;
}
