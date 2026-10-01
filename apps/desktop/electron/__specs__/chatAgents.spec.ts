import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import type { ChatEnvelope, ChatMode, ChatRequest } from "@slash-md/agents/types";

const h = vi.hoisted(() => ({ userData: "" }));

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => (name === "userData" ? h.userData : process.env.TMPDIR || "/tmp"),
  },
  safeStorage: { isEncryptionAvailable: () => false },
}));

const { abortAllChats, listChatAgents, startChat } = await import("../agents");
const { setWorkspaceRoot } = await import("../session");
const { ChatMode: Mode, ChatScope } = await import("@slash-md/agents/types");

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(process.env.TMPDIR || "/tmp", "slashmd-chat-"));
  h.userData = await fs.mkdtemp(path.join(process.env.TMPDIR || "/tmp", "slashmd-user-"));
});

afterEach(async () => {
  abortAllChats();
  setWorkspaceRoot(null);
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(h.userData, { recursive: true, force: true });
});

async function writeAgentConfig(agent: Record<string, unknown>): Promise<void> {
  await fs.writeFile(path.join(root, ".slashmd.json"), JSON.stringify({ mode: "local", mcp: { agent } }));
}

function request(prompt = "hola"): ChatRequest {
  return { scope: ChatScope.Global, mode: Mode.Chat as ChatMode, prompt };
}

async function waitFor(predicate: () => boolean, timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("timed out waiting for an agent event");
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe("startChat", () => {
  it("spawns a configured generic agent and forwards NDJSON deltas", async () => {
    const script = "process.stdout.write(JSON.stringify({type:'delta',text:'hola'})+'\\n')";
    await writeAgentConfig({ name: "node", args: ["-e", script] });
    setWorkspaceRoot(root);

    const events: ChatEnvelope[] = [];
    await startChat(request(), (message) => events.push(message));
    await waitFor(() => events.some((e) => e.event.type === "done" || e.event.type === "error"));

    expect(events.find((e) => e.event.type === "started")?.event).toEqual({ type: "started", agent: "node" });
    expect(events.some((e) => e.event.type === "delta" && e.event.text === "hola")).toBe(true);
    expect(events.at(-1)?.event.type).toBe("done");
    expect(events.every((e) => e.sessionId.length > 0)).toBe(true);
  });

  it("rejects when the configured command is not on PATH", async () => {
    await writeAgentConfig({ name: "slashmd-agent-that-does-not-exist" });
    setWorkspaceRoot(root);

    await expect(startChat(request(), () => {})).rejects.toThrow(/No se encontró/);
  });

  it("rejects an empty prompt without spawning", async () => {
    await expect(startChat(request("   "), () => {})).rejects.toThrow(/pregunta/);
  });
});

describe("listChatAgents", () => {
  it("lists the configured agent ahead of the built-in presets", async () => {
    await writeAgentConfig({ name: "node" });
    setWorkspaceRoot(root);

    const agents = await listChatAgents();
    expect(agents[0]).toMatchObject({ name: "node", label: "node", available: true });
    expect(agents.map((agent) => agent.name)).toEqual(
      expect.arrayContaining(["opencode", "claude", "codex"]),
    );
  });
});
