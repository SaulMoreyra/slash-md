import { ContentConfig } from "./config";
import { ContentRepo } from "./contentRepo";
import { GithubApiError, getPull, githubRequest } from "./api";
import { runGit } from "./git";
import type { ReviewThread, ReviewThreadComment } from "../domain/protocol";
import { findSnippetInText } from "../domain/commentAnchor";

export type { ReviewThread, ReviewThreadComment };

type GraphqlThreadsResponse = {
  data?: {
    repository?: {
      pullRequest?: {
        url?: string;
        reviewThreads?: {
          nodes?: Array<{
            id: string;
            isResolved: boolean;
            path: string | null;
            line: number | null;
            startLine: number | null;
            diffSide: "LEFT" | "RIGHT" | null;
            comments?: {
              nodes?: Array<{
                id: string;
                databaseId?: number | null;
                body: string;
                url: string;
                createdAt: string;
                author?: { login?: string; avatarUrl?: string } | null;
              }>;
            };
          } | null>;
        };
      } | null;
    } | null;
  };
  errors?: Array<{ message?: string }>;
};

const THREADS_QUERY = `
query SlashMdReviewThreads($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      url
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          path
          line
          startLine
          diffSide
          comments(first: 40) {
            nodes {
              id
              databaseId
              body
              url
              createdAt
              author { login avatarUrl }
            }
          }
        }
      }
    }
  }
}
`;

export async function githubGraphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "slash-md",
      },
      body: JSON.stringify({ query, variables }),
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
  const json = (await res.json()) as T & { errors?: Array<{ message?: string }> };
  if (!res.ok) {
    throw new GithubApiError(`GraphQL HTTP ${res.status}`, res.status);
  }
  if (json.errors?.length) {
    throw new GithubApiError(json.errors.map((e) => e.message).filter(Boolean).join("; ") || "GraphQL error", 400);
  }
  return json;
}

/**
 * Load review threads for a PR file path, with snippets from the PR head commit.
 */
export async function loadReviewThreads(opts: {
  token: string;
  config: ContentConfig;
  repos: ContentRepo;
  prNumber: number;
  remotePath: string;
}): Promise<{ threads: ReviewThread[]; prUrl: string; headOid: string }> {
  const { token, config, repos, prNumber, remotePath } = opts;
  const pr = await getPull(token, config, prNumber);
  const headOid = pr.head.sha;

  const gql = await githubGraphql<GraphqlThreadsResponse>(token, THREADS_QUERY, {
    owner: config.owner,
    name: config.name,
    number: prNumber,
  });
  const pull = gql.data?.repository?.pullRequest;
  const prUrl = pull?.url ?? pr.html_url;
  const nodes = pull?.reviewThreads?.nodes ?? [];

  await repos.ensureFetched(config, token);
  try {
    await runGit(["fetch", "origin", headOid], { cwd: repos.cloneDir(config).fsPath, token });
  } catch {
    try {
      await runGit(["fetch", "origin", pr.head.ref], { cwd: repos.cloneDir(config).fsPath, token });
    } catch {
      // Snippet may still work if oid is already present.
    }
  }

  const threads: ReviewThread[] = [];
  for (const node of nodes) {
    if (!node?.path || node.path !== remotePath) {
      continue;
    }
    if (node.diffSide === "LEFT") {
      continue;
    }
    const comments: ReviewThreadComment[] = (node.comments?.nodes ?? [])
      .filter(Boolean)
      .map((c) => ({
        id: c!.id,
        databaseId: typeof c!.databaseId === "number" ? c!.databaseId : null,
        body: c!.body ?? "",
        author: c!.author?.login ?? "unknown",
        avatarUrl: c!.author?.avatarUrl?.trim() || null,
        url: c!.url ?? prUrl,
        createdAt: c!.createdAt ?? "",
      }));
    if (comments.length === 0) {
      continue;
    }
    const snippet = await readSnippet(repos, config, headOid, node.path, node.startLine, node.line);
    threads.push({
      id: node.id,
      isResolved: Boolean(node.isResolved),
      path: node.path,
      line: node.line,
      startLine: node.startLine,
      diffSide: node.diffSide,
      snippet,
      url: comments[0]?.url ?? prUrl,
      comments,
    });
  }

  return { threads, prUrl, headOid };
}

async function readSnippet(
  repos: ContentRepo,
  config: ContentConfig,
  commitOid: string,
  path: string,
  startLine: number | null,
  line: number | null,
): Promise<string> {
  let text = "";
  try {
    text = await runGit(["show", `${commitOid}:${path}`], {
      cwd: repos.cloneDir(config).fsPath,
    });
  } catch {
    return "";
  }
  const lines = text.split(/\r?\n/);
  const end = Math.max(1, line ?? startLine ?? 1);
  const start = Math.max(1, startLine ?? line ?? end);
  const from = Math.min(start, end) - 1;
  const to = Math.max(start, end);
  return lines.slice(from, to).join("\n").trimEnd();
}

export async function replyToReviewComment(opts: {
  token: string;
  config: ContentConfig;
  prNumber: number;
  /** REST databaseId of the parent comment. */
  inReplyTo: number;
  body: string;
}): Promise<void> {
  const { token, config, prNumber, inReplyTo, body } = opts;
  await githubRequest(token, "POST", `/repos/${config.owner}/${config.name}/pulls/${prNumber}/comments`, {
    body,
    in_reply_to: inReplyTo,
  });
}

export async function setThreadResolved(opts: {
  token: string;
  threadId: string;
  resolved: boolean;
}): Promise<void> {
  const mutation = opts.resolved
    ? `mutation($id: ID!) { resolveReviewThread(input: { threadId: $id }) { thread { id isResolved } } }`
    : `mutation($id: ID!) { unresolveReviewThread(input: { threadId: $id }) { thread { id isResolved } } }`;
  await githubGraphql(opts.token, mutation, { id: opts.threadId });
}

export async function createLineReviewComment(opts: {
  token: string;
  config: ContentConfig;
  prNumber: number;
  commitId: string;
  path: string;
  line: number;
  body: string;
  startLine?: number;
}): Promise<void> {
  const { token, config, prNumber, commitId, path, line, body, startLine } = opts;
  const payload: Record<string, unknown> = {
    body,
    commit_id: commitId,
    path,
    line,
    side: "RIGHT",
  };
  if (startLine && startLine !== line) {
    payload.start_line = startLine;
    payload.start_side = "RIGHT";
  }
  await githubRequest(token, "POST", `/repos/${config.owner}/${config.name}/pulls/${prNumber}/comments`, payload);
}

/** 1-based line of the first match of selectedText in the committed file. */
export async function lineForSelection(opts: {
  repos: ContentRepo;
  config: ContentConfig;
  commitOid: string;
  path: string;
  selectedText: string;
}): Promise<{ line: number; startLine: number } | undefined> {
  let text = "";
  try {
    text = await runGit(["show", `${opts.commitOid}:${opts.path}`], {
      cwd: opts.repos.cloneDir(opts.config).fsPath,
    });
  } catch {
    return undefined;
  }
  const match = findSnippetInText(text, opts.selectedText);
  if (!match) {
    return undefined;
  }
  const before = text.slice(0, match.from);
  const startLine = before.split(/\r?\n/).length;
  const span = text.slice(match.from, match.to).split(/\r?\n/).length;
  return { startLine, line: startLine + span - 1 };
}

export async function canWriteToRepo(token: string, config: ContentConfig): Promise<boolean> {
  try {
    const data = await githubRequest<{ permissions?: { push?: boolean; admin?: boolean } }>(
      token,
      "GET",
      `/repos/${config.owner}/${config.name}`,
    );
    return Boolean(data.permissions?.push || data.permissions?.admin);
  } catch {
    return false;
  }
}
