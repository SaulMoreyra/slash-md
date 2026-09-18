import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMode, ChatScope, type ChatEnvelope } from "@slash-md/agents/types";
import type { DesktopApi } from "../../../../../shared/api";
import { act, renderHook, waitFor } from "../../../../test/render";
import { useChatController } from "../useChatController";

let emit: ((message: ChatEnvelope) => void) | undefined;

function stubApi(overrides: Partial<DesktopApi> = {}) {
  window.slashmd = {
    chatListAgents: vi.fn(async () => [
      { name: "codex", label: "Codex", command: "codex", available: false },
      { name: "opencode", label: "opencode", command: "opencode", available: true },
    ]),
    chatSend: vi.fn(async () => ({ sessionId: "s1" })),
    chatAbort: vi.fn(async () => undefined),
    onChatEvent: (listener: (message: ChatEnvelope) => void) => {
      emit = listener;
      return () => {
        emit = undefined;
      };
    },
    ...overrides,
  } as unknown as DesktopApi;
}

function renderChat() {
  return renderHook(() => useChatController({ scope: ChatScope.Global, mode: ChatMode.Chat }));
}

describe("useChatController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emit = undefined;
    stubApi();
  });

  it("loads agents and preselects the first available one", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));
    expect(result.current.agents.selected).toBe("opencode");
  });

  it("streams deltas into the active agent turn", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));

    act(() => result.current.composer.onDraftChange("hi"));
    await act(async () => {
      await result.current.composer.onSend();
    });

    await waitFor(() => expect(result.current.conversation.turns).toHaveLength(2));
    expect(result.current.conversation.streaming).toBe(true);

    act(() => {
      emit?.({ sessionId: "s1", event: { type: "started", agent: "opencode" } });
      emit?.({ sessionId: "s1", event: { type: "delta", text: "ho" } });
      emit?.({ sessionId: "s1", event: { type: "delta", text: "la" } });
    });

    expect(result.current.conversation.turns[1].text).toBe("hola");

    act(() => emit?.({ sessionId: "s1", event: { type: "done", code: 0 } }));
    expect(result.current.conversation.streaming).toBe(false);
  });

  it("ignores events from another session", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));

    act(() => result.current.composer.onDraftChange("hi"));
    await act(async () => {
      await result.current.composer.onSend();
    });
    await waitFor(() => expect(result.current.conversation.turns).toHaveLength(2));

    act(() => emit?.({ sessionId: "other", event: { type: "delta", text: "nope" } }));
    expect(result.current.conversation.turns[1].text).toBe("");
  });

  it("rewrites the page with the live buffer and forwards edit events", async () => {
    const onEditStart = vi.fn();
    const onEditStream = vi.fn();
    const onEditStop = vi.fn();
    const getBuffer = vi.fn(() => "# draft");
    const { result } = renderHook(() =>
      useChatController({
        scope: ChatScope.Page,
        mode: ChatMode.Chat,
        path: "docs/a.md",
        getBuffer,
        onEditStart,
        onEditStream,
        onEditStop,
      }),
    );
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));

    act(() => result.current.composer.onDraftChange("hazlo corto"));
    await act(async () => {
      await result.current.rewrite.onRewrite();
    });

    expect(onEditStart).toHaveBeenCalledTimes(1);
    expect(window.slashmd.chatSend).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: ChatMode.EditPage,
        path: "docs/a.md",
        bufferMarkdown: "# draft",
      }),
    );

    act(() => {
      emit?.({
        sessionId: "s1",
        event: { type: "editStream", markdown: "# corto" },
      });
    });
    expect(onEditStream).toHaveBeenCalledWith("# corto");

    act(() => emit?.({ sessionId: "s1", event: { type: "done", code: 0 } }));
    expect(onEditStop).toHaveBeenCalledTimes(1);
  });

  it("surfaces a send failure on the agent turn", async () => {
    stubApi({ chatSend: vi.fn(async () => Promise.reject(new Error("no agent"))) });
    const { result } = renderChat();
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));

    act(() => result.current.composer.onDraftChange("hi"));
    await act(async () => {
      await result.current.composer.onSend();
    });

    await waitFor(() => expect(result.current.conversation.turns[1]?.error).toBe("no agent"));
    expect(result.current.conversation.streaming).toBe(false);
  });
});
