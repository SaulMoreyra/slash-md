import { Client } from "@modelcontextprotocol/sdk/client";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { describe, expect, it } from "vitest";
import { createWikiMcpServer, WIKI_MCP_SERVER_NAME, startWikiHttpServer } from "../server";
import { WIKI_TOOL_NAMES } from "../tools";
import { fakeWiki } from "../__specs__/fakeWiki";

async function connect() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createWikiMcpServer(fakeWiki());
  const client = new Client({ name: "spec", version: "0.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client };
}

function textOf(result: CallToolResult): string {
  const part = result.content.find((c): c is Extract<CallToolResult["content"][number], { type: "text" }> => c.type === "text");
  return part?.text ?? "";
}

describe("createWikiMcpServer", () => {
  it("expone el servidor con su nombre y los 5 tools", async () => {
    const { client } = await connect();
    const info = client.getServerVersion();
    expect(info?.name).toBe(WIKI_MCP_SERVER_NAME);
    expect(info?.version).toBeTruthy();

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...WIKI_TOOL_NAMES].sort());
    const readPage = tools.find((t) => t.name === "read_page");
    expect(readPage?.inputSchema).toBeTypeOf("object");
    expect("path" in (readPage?.inputSchema?.properties ?? {})).toBe(true);
  });

  it("list_pages → read_page end-to-end", async () => {
    const { client } = await connect();

    const list = await client.callTool({ name: "list_pages", arguments: { limit: 10 } });
    expect(textOf(list)).toContain("docs/producto/hola.md");

    const page = await client.callTool({ name: "read_page", arguments: { path: "docs/producto/hola.md" } });
    expect(textOf(page)).toContain("# Hola");
  });

  it("devuelve error (isError) para páginas inexistentes", async () => {
    const { client } = await connect();
    const res = await client.callTool({ name: "read_page", arguments: { path: "docs/nope.md" } });
    expect(res.isError).toBe(true);
    expect(textOf(res)).toContain("No existe");
  });

  it("search_pages end-to-end", async () => {
    const { client } = await connect();
    const res = await client.callTool({ name: "search_pages", arguments: { query: "uñas", limit: 10 } });
    expect(textOf(res)).toContain("docs/guia/uñas.md");
  });
});

describe("startWikiHttpServer (Streamable HTTP real)", () => {
  it("initialize → tools/list → read_page sobre HTTP con sesión (SSE responses)", async () => {
    const handle = await startWikiHttpServer({ wiki: fakeWiki() });
    try {
      const base = handle.url;

      const initRes = await postJson(base, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "e2e", version: "0.0.0" },
        },
      });
      expect(initRes.status).toBe(200);
      const sessionId = initRes.headers.get("mcp-session-id");
      expect(sessionId).toBeTruthy();
      const initBody = await sseJson(await initRes.text());
      expect(initBody.result?.serverInfo?.name).toBe(WIKI_MCP_SERVER_NAME);

      const notifyRes = await postJson(
        base,
        { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
        sessionId,
      );
      expect(notifyRes.status).toBe(202);

      const toolsRes = await postJson(
        base,
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
        sessionId,
      );
      expect(toolsRes.status).toBe(200);
      const toolsBody = await sseJson(await toolsRes.text());
      const names = toolsBody.result?.tools?.map((t: { name: string }) => t.name).sort();
      expect(names).toEqual([...WIKI_TOOL_NAMES].sort());

      const readRes = await postJson(
        base,
        { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "read_page", arguments: { path: "docs/producto/hola.md" } } },
        sessionId,
      );
      expect(readRes.status).toBe(200);
      const readBody = await sseJson(await readRes.text());
      const text = readBody.result?.content?.[0]?.text ?? "";
      expect(text).toContain("# Hola");

      const closed = await fetch(`${base}/`, { method: "DELETE", headers: { "mcp-session-id": sessionId as string } });
      expect(closed.status).toBe(200);
    } finally {
      await handle.close();
    }
  });
});

async function sseJson(body: string): Promise<unknown> {
  for (const line of body.split("\n")) {
    if (line.startsWith("data: ")) {
      const raw = line.slice(6).trim();
      if (raw) {
        return JSON.parse(raw);
      }
    }
  }
  throw new Error("No data line in SSE response");
}

async function postJson(base: string, body: unknown, sessionId?: string | null): Promise<Response> {
  return fetch(`${base}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2024-11-05",
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify(body),
  });
}