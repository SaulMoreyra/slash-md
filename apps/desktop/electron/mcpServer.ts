import fs from "node:fs/promises";
import { splitFrontmatter } from "@slash-md/core/frontmatter";
import {
  startWikiHttpServer,
  type WikiGitContext,
  type WikiLote,
  type WikiMcpHttpHandle,
  type WikiPage,
  type WikiPageRef,
  type WikiSearchHit,
  type WikiSource,
} from "@slash-md/agents/server";
import { getContentConfig, readSlashmd, repoFile } from "./config";
import { currentBranchName, isGitWorkspace, runGit } from "./git";
import { buildSearchIndex, listLocalMarkdown, listPendingReviewMarkdown, titleFor } from "./workspace";

let active: { root: string; contentPath: string; handle: WikiMcpHttpHandle } | null = null;

export function mcpServerUrl(): string | null {
  return active?.handle.url ?? null;
}

/**
 * Starts the local wiki tools server (MCP Streamable HTTP) for a workspace,
 * only when `.slashmd.json` has `mcp.server.enabled: true`. Replaces any
 * previous server. Returns the base URL, or null when disabled/no content.
 */
export async function startMcpServerForRoot(root: string): Promise<string | null> {
  await stopMcpServer();
  const slashmd = await readSlashmd(root);
  const serverConf = slashmd.mcp?.server;
  if (!serverConf?.enabled) {
    return null;
  }
  const config = await getContentConfig(root);
  if (!config) {
    return null;
  }
  const wiki = createWikiSource(root, config.contentPath);
  const handle = await startWikiHttpServer({ port: serverConf.port, wiki });
  active = { root, contentPath: config.contentPath, handle };
  return handle.url;
}

export async function stopMcpServer(): Promise<void> {
  const current = active;
  active = null;
  if (current) {
    await current.handle.close();
  }
}

function createWikiSource(root: string, contentPath: string): WikiSource {
  return {
    contentPath,

    async listPages(limit: number): Promise<WikiPageRef[]> {
      const paths = (await listLocalMarkdown(root, contentPath)).slice(0, limit);
      const pages: WikiPageRef[] = [];
      for (const filePath of paths) {
        pages.push({
          path: filePath,
          title: await titleFor(root, filePath),
          updatedAt: (await mtimeFor(root, filePath)) ?? undefined,
        });
      }
      return pages;
    },

    async readPage(remotePath: string): Promise<WikiPage | null> {
      if (!remotePath.endsWith(".md")) {
        return null;
      }
      const abs = repoFile(root, remotePath);
      let stat: Awaited<ReturnType<typeof fs.stat>>;
      try {
        stat = await fs.stat(abs);
      } catch {
        return null;
      }
      if (!stat.isFile()) {
        return null;
      }
      const text = await fs.readFile(abs, "utf8");
      const { fields, body } = splitFrontmatter(text);
      const frontmatter = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => Boolean(value)),
      );
      return { path: remotePath, markdown: body || text, frontmatter };
    },

    async searchPages(query: string, limit: number): Promise<WikiSearchHit[]> {
      const entries = await buildSearchIndex(root, contentPath);
      const q = query.trim().toLowerCase();
      const hits: WikiSearchHit[] = [];
      for (const entry of entries) {
        if (
          entry.path.toLowerCase().includes(q) ||
          entry.title.toLowerCase().includes(q)
        ) {
          hits.push({ path: entry.path, title: entry.title });
          if (hits.length >= limit) {
            break;
          }
        }
      }
      return hits;
    },

    async gitContext(): Promise<WikiGitContext> {
      if (!(await isGitWorkspace(root))) {
        return { workspace: false, status: "El workspace no es un repositorio git." };
      }
      const branch = await currentBranchName(root);
      const [status, diff] = await Promise.all([
        runGit(["status", "--short"], { cwd: root }).catch(() => ""),
        runGit(["diff", "--stat"], { cwd: root }).catch(() => ""),
      ]);
      return {
        workspace: true,
        branch: branch ?? undefined,
        status: status || "(working tree limpio)",
        diff: diff.trim() ? diff : undefined,
      };
    },

    async reviewLote(): Promise<WikiLote> {
      if (!(await isGitWorkspace(root))) {
        return null;
      }
      const config = await getContentConfig(root);
      if (!config) {
        return null;
      }
      const branch = (await currentBranchName(root)) ?? config.defaultBranch;
      let files: string[];
      try {
        files = await listPendingReviewMarkdown(
          root,
          config.contentPath,
          config.defaultBranch,
          branch,
        );
      } catch {
        return null;
      }
      return { branch, files };
    },
  };
}

async function mtimeFor(root: string, remotePath: string): Promise<string | null> {
  try {
    const stat = await fs.stat(repoFile(root, remotePath));
    return stat.isFile() ? stat.mtime.toISOString() : null;
  } catch {
    return null;
  }
}