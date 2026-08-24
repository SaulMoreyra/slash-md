import * as vscode from "vscode";
import { splitFrontmatter } from "../domain/frontmatter";
import { findSnippetInText } from "../domain/commentAnchor";
import { posixBasename, posixNormalize } from "../domain/paths";
import { ContentConfig, getContentConfig } from "./config";
import { githubGraphql } from "./threads";
import {
  flattenInboxItems,
  snippetFromLines,
  type InboxItem,
  type InboxPullSeed,
} from "./inboxModel";

export type { InboxItem };
export type InboxResult = {
  items: InboxItem[];
  error?: string;
};

type GraphqlInboxResponse = {
  data?: {
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
              path: string | null;
              line: number | null;
              startLine: number | null;
              diffSide: "LEFT" | "RIGHT" | null;
              comments?: {
                nodes?: Array<{
                  body?: string;
                  createdAt?: string;
                  author?: { login?: string } | null;
                } | null>;
              };
            } | null>;
          };
        } | null>;
      };
    } | null;
  };
};

const INBOX_QUERY = `
query SlashMdInbox($owner: String!, $name: String!) {
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
            path
            line
            startLine
            diffSide
            comments(first: 1) {
              nodes {
                body
                createdAt
                author { login }
              }
            }
          }
        }
      }
    }
  }
}
`;

type CacheEntry = { key: string; at: number; result: InboxResult };

let cache: CacheEntry | undefined;
const CACHE_MS = 8_000;

export function invalidateInboxCache(): void {
  cache = undefined;
}

export async function loadInboxSilent(workspaceRoot?: vscode.Uri): Promise<InboxResult> {
  const config = getContentConfig();
  if (!config) {
    return { items: [] };
  }
  let token: string | undefined;
  let viewerHint: string | undefined;
  try {
    const session = await vscode.authentication.getSession("github", ["repo"], { silent: true });
    token = session?.accessToken;
    viewerHint = session?.account.label;
  } catch {
    return { items: [] };
  }
  if (!token) {
    return { items: [] };
  }
  return loadInbox({ token, config, viewerHint, workspaceRoot });
}

export async function loadInbox(opts: {
  token?: string;
  config?: ContentConfig;
  viewerHint?: string;
  workspaceRoot?: vscode.Uri;
}): Promise<InboxResult> {
  const { token, config } = opts;
  if (!token || !config) {
    return { items: [] };
  }
  const key = `${config.repo}|${config.contentPath}|${token.slice(0, 12)}`;
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_MS) {
    return cache.result;
  }
  try {
    const result = await fetchInbox(opts);
    cache = { key, at: Date.now(), result };
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const result: InboxResult = { items: [], error };
    cache = { key, at: Date.now(), result };
    return result;
  }
}

async function fetchInbox(opts: {
  token?: string;
  config?: ContentConfig;
  viewerHint?: string;
  workspaceRoot?: vscode.Uri;
}): Promise<InboxResult> {
  const token = opts.token;
  const config = opts.config;
  if (!token || !config) {
    return { items: [] };
  }

  const gql = await githubGraphql<GraphqlInboxResponse>(token, INBOX_QUERY, {
    owner: config.owner,
    name: config.name,
  });
  if (!gql.data?.repository) {
    return { items: [], error: "Content repo was not found." };
  }

  const viewer = gql.data.viewer?.login?.trim() || opts.viewerHint?.trim() || "";
  const pulls: InboxPullSeed[] = [];
  for (const node of gql.data.repository.pullRequests?.nodes ?? []) {
    if (!node) {
      continue;
    }
    pulls.push({
      number: node.number,
      url: node.url,
      author: node.author?.login,
      threads: (node.reviewThreads?.nodes ?? []).filter(Boolean).map((thread) => {
        const first = thread!.comments?.nodes?.find(Boolean);
        return {
          id: thread!.id,
          isResolved: Boolean(thread!.isResolved),
          path: thread!.path,
          line: thread!.line ?? null,
          startLine: thread!.startLine ?? null,
          diffSide: thread!.diffSide ?? null,
          body: first?.body,
          author: first?.author?.login,
          createdAt: first?.createdAt,
        };
      }),
    });
  }

  const items = flattenInboxItems({
    pulls,
    viewer,
    contentPath: config.contentPath,
  });

  if (opts.workspaceRoot) {
    for (const item of items) {
      const snippet = await readWorkspaceSnippet(opts.workspaceRoot, item.path, item.startLine ?? null, item.line ?? null);
      if (snippet) {
        item.snippet = snippet;
      }
    }
  }

  return { items };
}

async function readWorkspaceSnippet(
  root: vscode.Uri,
  remotePath: string,
  startLine: number | null,
  line: number | null,
): Promise<string> {
  try {
    const uri = vscode.Uri.joinPath(root, ...remotePath.split("/").filter(Boolean));
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    return snippetFromLines(text, startLine, line);
  } catch {
    return "";
  }
}

export async function findWorkspaceFileForInbox(opts: {
  root: vscode.Uri;
  path: string;
  prNumber: number;
  files: string[];
  snippet?: string;
}): Promise<vscode.Uri | undefined> {
  const direct = vscode.Uri.joinPath(opts.root, ...posixNormalize(opts.path).split("/").filter(Boolean));
  if (await fileExists(direct)) {
    return direct;
  }

  const wanted = posixBasename(opts.path);
  const prMatches: vscode.Uri[] = [];
  for (const file of opts.files) {
    const uri = vscode.Uri.joinPath(opts.root, ...file.split("/").filter(Boolean));
    try {
      const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
      const { fields } = splitFrontmatter(text);
      if (String(fields.pr) !== String(opts.prNumber)) {
        continue;
      }
      if (posixBasename(file) === wanted) {
        return uri;
      }
      prMatches.push(uri);
    } catch {
      continue;
    }
  }

  const snippet = opts.snippet?.trim();
  if (snippet) {
    for (const uri of prMatches) {
      try {
        const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
        if (findSnippetInText(text, snippet)) {
          return uri;
        }
      } catch {
        continue;
      }
    }
  }
  return prMatches[0];
}

export async function snippetFromWorkspaceFile(
  uri: vscode.Uri,
  startLine: number | null,
  line: number | null,
): Promise<string> {
  try {
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    return snippetFromLines(text, startLine, line);
  } catch {
    return "";
  }
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.File) !== 0;
  } catch {
    return false;
  }
}
