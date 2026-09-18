import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChatRole, TurnStatus } from "../enums";
import {
  chatStorageKey,
  clearChatSession,
  loadChatSession,
  saveChatSession,
} from "../chatStorage";

function agentTurn(id: string, text: string, status: TurnStatus = TurnStatus.Done) {
  return { id, role: ChatRole.Agent, text, thinking: "", status, tools: [] };
}

describe("chatStorage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("builds a scoped storage key", () => {
    expect(chatStorageKey("page:/docs/a.md")).toBe("slashmd:chat:v1:page:/docs/a.md");
  });

  it("returns an empty session when nothing is stored", () => {
    expect(loadChatSession("page:/docs/a.md")).toEqual({ draft: "", turns: [], agent: null });
  });

  it("round-trips a session", () => {
    const session = {
      draft: "hola",
      turns: [agentTurn("t1", "ok")],
      agent: "better-agent",
    };
    saveChatSession("page:/docs/a.md", session);
    expect(loadChatSession("page:/docs/a.md")).toEqual(session);
  });

  it("clears a session", () => {
    saveChatSession("global", { draft: "x", turns: [agentTurn("t1", "ok")], agent: null });
    clearChatSession("global");
    expect(loadChatSession("global")).toEqual({ draft: "", turns: [], agent: null });
  });

  it("degrades to an empty session on corrupt payload", () => {
    window.localStorage.setItem("slashmd:chat:v1:global", "not json{{");
    expect(loadChatSession("global")).toEqual({ draft: "", turns: [], agent: null });
  });

  it("sanitizes malformed turns", () => {
    window.localStorage.setItem(
      "slashmd:chat:v1:global",
      JSON.stringify({
        draft: "d",
        agent: "agent-a",
        turns: [
          agentTurn("ok", "fine"),
          { role: ChatRole.User },
          "nope",
          agentTurn("streaming", "partial", TurnStatus.Streaming),
        ],
      }),
    );
    const { turns } = loadChatSession("global");
    expect(turns).toHaveLength(2);
    expect(turns.map((turn) => turn.id)).toEqual(["ok", "streaming"]);
    expect(turns[1]?.status).toBe(TurnStatus.Done);
  });

  it("caps the persisted turns", () => {
    const many = Array.from({ length: 60 }, (_, i) => agentTurn(`t${i}`, String(i)));
    saveChatSession("global", { draft: "", turns: many, agent: null });
    const stored = JSON.parse(window.localStorage.getItem("slashmd:chat:v1:global") ?? "") as {
      turns: unknown[];
    };
    expect(stored.turns).toHaveLength(50);
  });
});