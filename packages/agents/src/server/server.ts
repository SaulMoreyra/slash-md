import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import type { z } from "zod";
import { gitContextSchema, listPagesSchema, readPageSchema, reviewLoteSchema, searchPagesSchema } from "./schemas";
import { createWikiTools } from "./tools";
import type { WikiSource } from "./types";

export const WIKI_MCP_SERVER_NAME = "slash-md-wiki";
export const WIKI_MCP_SERVER_VERSION = "0.1.0";

export type WikiToolDefinition = {
  name: string;
  title: string;
  description: string;
  schema: z.ZodType;
};

export const WIKI_TOOL_DEFINITIONS: WikiToolDefinition[] = [
  {
    name: "list_pages",
    title: "Listas las páginas del wiki",
    description:
      "Lista las páginas del wiki (paths repos-relative) con títulos opcionales. Usa limit para acotar.",
    schema: listPagesSchema,
  },
  {
    name: "read_page",
    title: "Lee el contenido de una página",
    description:
      "Lee el markdown de una página del wiki (frontmatter + cuerpo). Requiere el path repos-relative, p. ej. docs/producto/hola.md.",
    schema: readPageSchema,
  },
  {
    name: "search_pages",
    title: "Busca páginas del wiki",
    description: "Busca páginas cuyo path o título coincidan con un término. Devuelve paths y títulos.",
    schema: searchPagesSchema,
  },
  {
    name: "get_git_context",
    title: "Contexto git del workspace",
    description:
      "Devuelve la rama actual, el estado (git status --short) y el resumen de diff sin confirmar del workspace.",
    schema: gitContextSchema,
  },
  {
    name: "get_review_lote",
    title: "Lote de revisión activo",
    description:
      "Devuelve el lote de revisión actual (rama + archivos pendientes), o indica que no hay lote activo.",
    schema: reviewLoteSchema,
  },
];

/** Builds the MCP server exposing the wiki tools. Shared by sessions and tests. */
export function createWikiMcpServer(wiki: WikiSource): McpServer {
  const server = new McpServer({
    name: WIKI_MCP_SERVER_NAME,
    version: WIKI_MCP_SERVER_VERSION,
  });
  const tools = createWikiTools(wiki);
  for (const definition of WIKI_TOOL_DEFINITIONS) {
    server.registerTool(
      definition.name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.schema,
      },
      (args) => tools[definition.name as keyof typeof tools]((args ?? {}) as Record<string, unknown>),
    );
  }
  return server;
}

export type WikiMcpHttpHandle = {
  url: string;
  close: () => Promise<void>;
};

/**
 * Runs the wiki tools server over MCP Streamable HTTP on 127.0.0.1.
 * `port: 0` picks a free port (used by tests and the smoke run).
 */
export async function startWikiHttpServer(opts: {
  port?: number;
  wiki: WikiSource;
}): Promise<WikiMcpHttpHandle> {
  const sessions = new Map<string, Session>();
  const server = createServer((req, res) => {
    void handleStreamableRequest(opts.wiki, sessions, req, res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            for (const session of sessions.values()) {
              void session.transport.close();
            }
            sessions.clear();
            server.close(() => done());
          }),
      });
    });
  });
}

const MAX_SESSIONS = 32;
type Session = { transport: StreamableHTTPServerTransport };

async function handleStreamableRequest(
  wiki: WikiSource,
  sessions: Map<string, Session>,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const method = req.method?.toUpperCase();

    if (method === "GET") {
      const session = newSession(wiki, sessions);
      await session.transport.handleRequest(req, res);
      remember(session, sessions);
      return;
    }

    if (method === "POST") {
      const sessionId = mcpSessionId(req);
      const session = (sessionId ? sessions.get(sessionId) : undefined) ?? newSession(wiki, sessions);
      const body = await readJsonBody(req);
      await session.transport.handleRequest(req, res, body);
      remember(session, sessions);
      return;
    }

    if (method === "DELETE") {
      const sessionId = mcpSessionId(req);
      if (!sessionId) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Unknown session");
        return;
      }
      const session = sessions.get(sessionId);
      if (!session) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Unknown session");
        return;
      }
      sessions.delete(sessionId);
      await session.transport.close();
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Closed");
      return;
    }

    res.writeHead(405, { Allow: "GET, POST, DELETE", "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(400, { "Content-Type": "application/json" });
    }
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
      }),
    );
  }
}

function remember(session: Session, sessions: Map<string, Session>): void {
  if (session.transport.sessionId && !sessions.has(session.transport.sessionId)) {
    sessions.set(session.transport.sessionId, session);
  }
}

function newSession(wiki: WikiSource, sessions: Map<string, Session>): Session {
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (oldest) {
      void sessions.get(oldest)?.transport.close();
      sessions.delete(oldest);
    }
  }
  const server = createWikiMcpServer(wiki);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId);
    }
  };
  void server.connect(transport).catch((err) => {
    console.warn("[mcp] failed to attach transport", err);
  });
  return { transport };
}

function mcpSessionId(req: IncomingMessage): string | null {
  const raw = req.headers["mcp-session-id"];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`Cuerpo JSON inválido: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
    req.on("error", reject);
  });
}