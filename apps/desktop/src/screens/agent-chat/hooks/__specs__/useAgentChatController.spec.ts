import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ChatRole, TurnStatus } from "../../../chat/enums";
import { listChatSessions, saveChatSession } from "../../../chat/chatStorage";
import { useAgentChatController } from "../useAgentChatController";

function userTurn(id: string, text: string) {
  return { id, role: ChatRole.User, text, thinking: "", status: TurnStatus.Done, tools: [] };
}

describe("useAgentChatController", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  const runHook = () => renderHook(() => useAgentChatController());

  it("starts with no selection when there are no sessions", () => {
    const { result } = runHook();
    expect(result.current.sessions).toEqual([]);
    expect(result.current.selectedKey).toBeNull();
  });

  it("selects the most recent session on mount", () => {
    saveChatSession("global", { draft: "", turns: [userTurn("u", "hello")], agent: null });
    const { result } = runHook();
    expect(result.current.selectedKey).toBe("global");
    expect(result.current.sessions).toHaveLength(1);
  });

  it("starts a fresh thread under a new key", () => {
    const { result } = runHook();
    act(() => result.current.onNew());
    expect(result.current.selectedKey).toMatch(/^thread:/);
  });

  it("selects a session by key", () => {
    saveChatSession("page:/docs/a.md", { draft: "", turns: [userTurn("u", "hi")], agent: null });
    const { result } = runHook();
    act(() => result.current.onSelect("page:/docs/a.md"));
    expect(result.current.selectedKey).toBe("page:/docs/a.md");
  });

  it("refreshes the index when storage changes", () => {
    const { result } = runHook();
    act(() => {
      saveChatSession("global", { draft: "", turns: [userTurn("u", "hi")], agent: null });
    });
    expect(result.current.sessions.map((session) => session.contextKey)).toEqual(["global"]);
  });

  it("deletes a session and falls back to the next one", () => {
    saveChatSession("global", { draft: "", turns: [userTurn("u", "one")], agent: null });
    saveChatSession("page:/docs/a.md", {
      draft: "",
      turns: [userTurn("u2", "two")],
      agent: null,
    });
    const { result } = runHook();
    expect(result.current.sessions).toHaveLength(2);
    act(() => result.current.onDelete("global"));
    expect(result.current.sessions.map((session) => session.contextKey)).toEqual([
      "page:/docs/a.md",
    ]);
    expect(listChatSessions()).toHaveLength(1);
  });
});