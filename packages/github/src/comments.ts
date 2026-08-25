import { findSnippetInText } from "@slash-md/core/commentAnchor";
import type { ReviewThread, ReviewThreadComment } from "@slash-md/core/protocol";
import { snippetFromLines, flattenInboxItems, type InboxPullSeed } from "./inboxModel";
import { createGraphql, createOctokit } from "./octokit";
import { getPull } from "./api";

export type RepoRef = { owner: string; name: string };

type RestReviewComment = {
  id: number;
  node_id?: string;
  body?: string | null;
  path?: string;
  line?: number | null;
  original_line?: number | null;
  start_line?: number | null;
  side?: string | null;
  start_side?: string | null;
  in_reply_to_id?: number | null;
  html_url?: string;
  created_at?: string;
  commit_id?: string;
  pull_request_url?: string;
  user?: { login?: string; avatar_url?: string } | null;
};

type GraphqlThreadsResponse = {
  repository?: {
    pullRequest?: {
      url?: string;
      reviewThreads?: {
        nodes?: Array<{
          id: string;
          isResolved: boolean;
          comments?: {
            nodes?: Array<{ databaseId?: number | null } | null>;
          };
        } | null>;
      };
    } | null;
  } | null;
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
          comments(first: 1) { nodes { databaseId } }
        }
      }
    }
  }
}
`;

type GraphqlInboxResponse = {
  viewer?: { login?: string };
  repository?: {
    pullRequests?: {
      nodes?: Array<{
        number: number;
        url: string;
        author?: { login?: string } | null;
        reviewThreads?: {
          nodes?: Array<{
            id: string;
            isResolved: boolean;
            comments?: { nodes?: Array<{ databaseId?: number | null } | null> };
          } | null>;
        };
      } | null>;
    };
  } | null;
};

const INBOX_RESOLVED_QUERY = `
query SlashMdInboxResolved($owner: String!, $name: String!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    pullRequests(first: 30, states: [OPEN], orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        number
        url
        author { login }
        reviewThreads(first: 80) {
          nodes {
            id
            isResolved
            comments(first: 1) { nodes { databaseId } }
          }
        }
      }
    }
  }
}
`;

export async function listPullReviewComments(
  token: string,
  repo: RepoRef,
  prNumber: number,
): Promise<RestReviewComment[]> {
  const octokit = createOctokit(token);
  return octokit.paginate(octokit.rest.pulls.listReviewComments, {
    owner: repo.owner,
    repo: repo.name,
    pull_number: prNumber,
    per_page: 100,
  }) as Promise<RestReviewComment[]>;
}

export function groupReviewComments(comments: RestReviewComment[]): RestReviewComment[][] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const children = new Map<number, RestReviewComment[]>();
  const roots: RestReviewComment[] = [];

  for (const comment of comments) {
    const parent = comment.in_reply_to_id;
    if (parent && byId.has(parent)) {
      const list = children.get(parent) ?? [];
      list.push(comment);
      children.set(parent, list);
      continue;
    }
    roots.push(comment);
  }

  return roots.map((root) => {
    const replies = (children.get(root.id) ?? []).slice().sort(byCreated);
    return [root, ...replies];
  });
}

function byCreated(a: RestReviewComment, b: RestReviewComment): number {
  return Date.parse(a.created_at ?? "") - Date.parse(b.created_at ?? "");
}

function restToComment(comment: RestReviewComment, fallbackUrl: string): ReviewThreadComment {
  return {
    id: comment.node_id || String(comment.id),
    databaseId: comment.id,
    body: comment.body ?? "",
    author: comment.user?.login ?? "unknown",
    avatarUrl: comment.user?.avatar_url?.trim() || null,
    url: comment.html_url ?? fallbackUrl,
    createdAt: comment.created_at ?? "",
  };
}

function diffSide(comment: RestReviewComment): "LEFT" | "RIGHT" | null {
  const side = (comment.side || comment.start_side || "").toUpperCase();
  if (side === "LEFT" || side === "RIGHT") {
    return side;
  }
  return null;
}

export async function loadReviewThreadsRest(opts: {
  token: string;
  repo: RepoRef;
  prNumber: number;
  remotePath: string;
  fileText?: string;
}): Promise<{ threads: ReviewThread[]; prUrl: string; headOid: string }> {
  const { token, repo, prNumber, remotePath } = opts;
  const pr = await getPull(token, repo, prNumber);
  const prUrl = pr.html_url;
  const headOid = pr.head.sha;
  const comments = (await listPullReviewComments(token, repo, prNumber)).filter(
    (comment) => comment.path === remotePath && diffSide(comment) !== "LEFT",
  );
  const groups = groupReviewComments(comments);
  const resolved = await loadResolvedByDatabaseId(token, repo, prNumber);

  const threads: ReviewThread[] = [];
  for (const group of groups) {
    const root = group[0];
    if (!root) {
      continue;
    }
    const firstDb = root.id;
    const gql = resolved.get(firstDb);
    const commentsMapped = group.map((item) => restToComment(item, prUrl));
    if (commentsMapped.length === 0) {
      continue;
    }
    const startLine = root.start_line ?? root.line ?? null;
    const line = root.line ?? root.original_line ?? startLine;
    threads.push({
      id: gql?.id ?? `rest:${firstDb}`,
      isResolved: Boolean(gql?.isResolved),
      path: root.path ?? remotePath,
      line,
      startLine,
      diffSide: diffSide(root),
      snippet: opts.fileText ? snippetFromLines(opts.fileText, startLine, line) : "",
      url: commentsMapped[0]?.url ?? prUrl,
      comments: commentsMapped,
    });
  }

  return { threads, prUrl, headOid };
}

async function loadResolvedByDatabaseId(
  token: string,
  repo: RepoRef,
  prNumber: number,
): Promise<Map<number, { id: string; isResolved: boolean }>> {
  const map = new Map<number, { id: string; isResolved: boolean }>();
  try {
    const gql = createGraphql(token);
    const data = await gql<GraphqlThreadsResponse>(THREADS_QUERY, {
      owner: repo.owner,
      name: repo.name,
      number: prNumber,
    });
    for (const node of data.repository?.pullRequest?.reviewThreads?.nodes ?? []) {
      if (!node?.id) {
        continue;
      }
      const databaseId = node.comments?.nodes?.find(Boolean)?.databaseId;
      if (typeof databaseId !== "number") {
        continue;
      }
      map.set(databaseId, { id: node.id, isResolved: Boolean(node.isResolved) });
    }
  } catch {
    // REST threads still render; resolve needs a GraphQL thread id.
  }
  return map;
}

export async function replyToReviewCommentRest(opts: {
  token: string;
  repo: RepoRef;
  prNumber: number;
  inReplyTo: number;
  body: string;
}): Promise<void> {
  const octokit = createOctokit(opts.token);
  await octokit.rest.pulls.createReplyForReviewComment({
    owner: opts.repo.owner,
    repo: opts.repo.name,
    pull_number: opts.prNumber,
    comment_id: opts.inReplyTo,
    body: opts.body,
  });
}

export async function createLineReviewCommentRest(opts: {
  token: string;
  repo: RepoRef;
  prNumber: number;
  commitId: string;
  path: string;
  line: number;
  body: string;
  startLine?: number;
}): Promise<void> {
  const octokit = createOctokit(opts.token);
  const payload: Parameters<typeof octokit.rest.pulls.createReviewComment>[0] = {
    owner: opts.repo.owner,
    repo: opts.repo.name,
    pull_number: opts.prNumber,
    body: opts.body,
    commit_id: opts.commitId,
    path: opts.path,
    line: opts.line,
    side: "RIGHT",
  };
  if (opts.startLine && opts.startLine !== opts.line) {
    payload.start_line = opts.startLine;
    payload.start_side = "RIGHT";
  }
  await octokit.rest.pulls.createReviewComment(payload);
}

export async function setThreadResolvedGraphql(opts: {
  token: string;
  threadId: string;
  resolved: boolean;
}): Promise<void> {
  if (opts.threadId.startsWith("rest:")) {
    throw new Error("This thread cannot be resolved until GitHub returns a review-thread id.");
  }
  const gql = createGraphql(opts.token);
  const mutation = opts.resolved
    ? `mutation($id: ID!) { resolveReviewThread(input: { threadId: $id }) { thread { id isResolved } } }`
    : `mutation($id: ID!) { unresolveReviewThread(input: { threadId: $id }) { thread { id isResolved } } }`;
  await gql(mutation, { id: opts.threadId });
}

export async function canWriteToRepoRest(token: string, repo: RepoRef): Promise<boolean> {
  try {
    const octokit = createOctokit(token);
    const { data } = await octokit.rest.repos.get({ owner: repo.owner, repo: repo.name });
    return Boolean(data.permissions?.push || data.permissions?.admin);
  } catch {
    return false;
  }
}

export async function getAuthenticatedLogin(token: string): Promise<string> {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}

export async function loadInboxRest(opts: {
  token: string;
  repo: RepoRef;
  contentPath: string;
  viewerHint?: string;
  fileText?: (path: string) => Promise<string>;
}): Promise<{ items: ReturnType<typeof flattenInboxItems>; error?: string }> {
  const octokit = createOctokit(opts.token);
  let viewer = opts.viewerHint?.trim() || "";
  try {
    if (!viewer) {
      viewer = await getAuthenticatedLogin(opts.token);
    }
  } catch {
    viewer = "";
  }

  let pulls: Awaited<ReturnType<typeof octokit.rest.pulls.list>>["data"];
  try {
    const listed = await octokit.rest.pulls.list({
      owner: opts.repo.owner,
      repo: opts.repo.name,
      state: "open",
      per_page: 30,
      sort: "updated",
      direction: "desc",
    });
    pulls = listed.data;
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : String(err) };
  }

  const resolvedByPr = await loadInboxResolvedMap(opts.token, opts.repo);
  const seeds: InboxPullSeed[] = [];

  for (const pull of pulls) {
    let comments: RestReviewComment[] = [];
    try {
      comments = await listPullReviewComments(opts.token, opts.repo, pull.number);
    } catch {
      continue;
    }
    const groups = groupReviewComments(comments.filter((comment) => diffSide(comment) !== "LEFT"));
    const resolved = resolvedByPr.get(pull.number);
    seeds.push({
      number: pull.number,
      url: pull.html_url,
      author: pull.user?.login,
      threads: groups.map((group) => {
        const root = group[0]!;
        const gql = resolved?.get(root.id);
        return {
          id: gql?.id ?? `rest:${root.id}`,
          isResolved: Boolean(gql?.isResolved),
          path: root.path ?? null,
          line: root.line ?? root.original_line ?? null,
          startLine: root.start_line ?? root.line ?? null,
          diffSide: diffSide(root),
          body: root.body ?? "",
          author: root.user?.login,
          createdAt: root.created_at,
        };
      }),
    });
  }

  const items = flattenInboxItems({
    pulls: seeds,
    viewer,
    contentPath: opts.contentPath,
  });

  if (opts.fileText) {
    for (const item of items) {
      try {
        const text = await opts.fileText(item.path);
        const snippet = snippetFromLines(text, item.startLine ?? null, item.line ?? null);
        if (snippet) {
          item.snippet = snippet;
        }
      } catch {
        // keep empty snippet
      }
    }
  }

  return { items };
}

async function loadInboxResolvedMap(
  token: string,
  repo: RepoRef,
): Promise<Map<number, Map<number, { id: string; isResolved: boolean }>>> {
  const byPr = new Map<number, Map<number, { id: string; isResolved: boolean }>>();
  try {
    const gql = createGraphql(token);
    const data = await gql<GraphqlInboxResponse>(INBOX_RESOLVED_QUERY, {
      owner: repo.owner,
      name: repo.name,
    });
    for (const pull of data.repository?.pullRequests?.nodes ?? []) {
      if (!pull) {
        continue;
      }
      const inner = new Map<number, { id: string; isResolved: boolean }>();
      for (const node of pull.reviewThreads?.nodes ?? []) {
        if (!node?.id) {
          continue;
        }
        const databaseId = node.comments?.nodes?.find(Boolean)?.databaseId;
        if (typeof databaseId !== "number") {
          continue;
        }
        inner.set(databaseId, { id: node.id, isResolved: Boolean(node.isResolved) });
      }
      byPr.set(pull.number, inner);
    }
  } catch {
    // Inbox still lists REST comments; resolved state may be missing.
  }
  return byPr;
}

export function lineForSnippet(text: string, selectedText: string): { line: number; startLine: number } | undefined {
  const match = findSnippetInText(text, selectedText);
  if (!match) {
    return undefined;
  }
  const before = text.slice(0, match.from);
  const startLine = before.split(/\r?\n/).length;
  const span = text.slice(match.from, match.to).split(/\r?\n/).length;
  return { startLine, line: startLine + span - 1 };
}
