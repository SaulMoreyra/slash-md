import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatScope } from "@slash-md/agents/types";
import { ChatRole, TurnStatus } from "../enums";
import {
  CHAT_STORAGE_CHANGED_EVENT,
  chatStorageKey,
  clearChatSession,
  deleteChatSession,
  listChatSessions,
  loadChatSession,
  saveChatSession,
  sessionScopeAndPath,
  sessionTitle,
} from "../chatStorage";

function agentTurn(id: string, text: string, status: TurnStatus = TurnStatus.Done) {
  return { id, role: ChatRole.Agent, text, thinking: "", status, tools: [] };
}

function userTurn(id: string, text: string) {
  return { id, role: ChatRole.User, text, thinking: "", status: TurnStatus.Done, tools: [] };
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

  it("writes an updatedAt timestamp when saving", () => {
    saveChatSession("global", { draft: "", turns: [], agent: null });
    const stored = JSON.parse(window.localStorage.getItem("slashmd:chat:v1:global") ?? "") as {
      updatedAt?: string;
    };
    expect(Number.isFinite(Date.parse(stored.updatedAt ?? ""))).toBe(true);
  });

  it("notifies listeners when a session is saved or cleared", () => {
    const onChanged = vi.fn();
    window.addEventListener(CHAT_STORAGE_CHANGED_EVENT, onChanged);
    saveChatSession("global", { draft: "x", turns: [], agent: null });
    clearChatSession("global");
    window.removeEventListener(CHAT_STORAGE_CHANGED_EVENT, onChanged);
    expect(onChanged).toHaveBeenCalledTimes(2);
  });
});

describe("chatStorage history", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("lists sessions newest first", async () => {
    saveChatSession("global", { draft: "", turns: [userTurn("u1", "older")], agent: null });
    await new Promise((resolve) => setTimeout(resolve, 5));
    saveChatSession("page:/docs/a.md", {
      draft: "",
      turns: [userTurn("u2", "newer")],
      agent: null,
    });
    const sessions = listChatSessions();
    expect(sessions.map((session) => session.contextKey)).toEqual([
      "page:/docs/a.md",
      "global",
    ]);
  });

  it("derives the title from the first user turn", () => {
    expect(sessionTitle([agentTurn("a", "hi"), userTurn("u", "  Explain   this  ")])).toBe(
      "Explain this",
    );
  });

  it("truncates long titles", () => {
    const title = sessionTitle([userTurn("u", "x".repeat(200))]);
    expect(title).toHaveLength(60);
    expect(title.endsWith("…")).toBe(true);
  });

  it("reports empty title without a user turn", () => {
    expect(sessionTitle([agentTurn("a", "hi")])).toBe("");
  });

  it("maps page-prefixed keys to page scope and others to global", () => {
    expect(sessionScopeAndPath("page:/docs/a.md")).toEqual({
      scope: ChatScope.Page,
      path: "/docs/a.md",
    });
    expect(sessionScopeAndPath("global")).toEqual({
      scope: ChatScope.Global,
      path: null,
    });
  });

  it("deletes a session from the index", () => {
    saveChatSession("global", { draft: "", turns: [userTurn("u", "hi")], agent: null });
    deleteChatSession("global");
    expect(listChatSessions()).toHaveLength(0);
    expect(loadChatSession("global")).toEqual({ draft: "", turns: [], agent: null });
  });
});