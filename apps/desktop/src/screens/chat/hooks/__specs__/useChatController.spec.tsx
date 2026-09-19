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
    window.localStorage.clear();
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
        getEditApi: () => ({ onEditStart, onEditStream, onEditStop }),
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

  it("persists the draft while typing", async () => {
    const { result } = renderHook(() =>
      useChatController({ scope: ChatScope.Global, mode: ChatMode.Chat, storageKey: "global" }),
    );
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));

    act(() => result.current.composer.onDraftChange("mid-write"));
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("slashmd:chat:v1:global") ?? "{}") as {
        draft: string;
      };
      expect(stored.draft).toBe("mid-write");
    });
  });

  it("flushes the session when unmounted", async () => {
    const { result, unmount } = renderHook(() =>
      useChatController({ scope: ChatScope.Global, mode: ChatMode.Chat, storageKey: "global" }),
    );
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));

    act(() => result.current.composer.onDraftChange("unmount-me"));
    unmount();

    const stored = JSON.parse(window.localStorage.getItem("slashmd:chat:v1:global") ?? "{}") as {
      draft: string;
    };
    expect(stored.draft).toBe("unmount-me");
  });

  it("restores the stored thread for a context key", () => {
    window.localStorage.setItem(
      "slashmd:chat:v1:page:/docs/a.md",
      JSON.stringify({
        draft: "reply",
        agent: "opencode",
        turns: [
          {
            id: "t1",
            role: "agent",
            text: "ok",
            thinking: "",
            status: "done",
            tools: [],
          },
        ],
      }),
    );

    const { result } = renderHook(() =>
      useChatController({
        scope: ChatScope.Page,
        mode: ChatMode.Chat,
        path: "docs/a.md",
        storageKey: "page:/docs/a.md",
      }),
    );

    expect(result.current.composer.draft).toBe("reply");
    expect(result.current.conversation.turns).toHaveLength(1);
    expect(result.current.agents.selected).toBe("opencode");
  });

  it("flushes the active context and restores the next one on switch", () => {
    window.localStorage.setItem(
      "slashmd:chat:v1:page:/docs/b.md",
      JSON.stringify({ draft: "b-thread", turns: [], agent: null }),
    );

    const { result, rerender } = renderHook(
      ({ storageKey }: { storageKey: string }) =>
        useChatController({
          scope: ChatScope.Page,
          mode: ChatMode.Chat,
          path: storageKey,
          storageKey,
        }),
      { initialProps: { storageKey: "page:/docs/a.md" } },
    );

    act(() => result.current.composer.onDraftChange("a-thread"));
    rerender({ storageKey: "page:/docs/b.md" });

    const storedA = JSON.parse(
      window.localStorage.getItem("slashmd:chat:v1:page:/docs/a.md") ?? "{}",
    ) as { draft: string };
    expect(storedA.draft).toBe("a-thread");
    expect(result.current.composer.draft).toBe("b-thread");
  });

  it("aborts a mid-flight session when the context switches", async () => {
    const { result, rerender } = renderHook(
      ({ storageKey }: { storageKey?: string }) =>
        useChatController({ scope: ChatScope.Global, mode: ChatMode.Chat, storageKey }),
      { initialProps: { storageKey: "global" } },
    );
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));

    act(() => result.current.composer.onDraftChange("hi"));
    await act(async () => {
      await result.current.composer.onSend();
    });
    await waitFor(() => expect(result.current.conversation.streaming).toBe(true));

    rerender({ storageKey: "page:/docs/c.md" });

    expect(window.slashmd.chatAbort).toHaveBeenCalledWith("s1");
    expect(result.current.conversation.streaming).toBe(false);
    expect(result.current.conversation.turns).toHaveLength(0);
  });

  it("sends cleaned mentions as references", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));

    act(() =>
      result.current.composer.onDraftChange("Mirá @docs/a.md y @docs/b.md por favor"),
    );
    await act(async () => {
      await result.current.composer.onSend();
    });

    expect(window.slashmd.chatSend).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Mirá y por favor",
        references: ["docs/a.md", "docs/b.md"],
      }),
    );
    expect(result.current.conversation.turns[0]?.text).toBe(
      "Mirá @docs/a.md y @docs/b.md por favor",
    );
  });

  it("does not send a prompt made only of mentions", async () => {
    const { result } = renderChat();
    await waitFor(() => expect(result.current.agents.items).toHaveLength(2));

    act(() => result.current.composer.onDraftChange("@docs/a.md"));
    await act(async () => {
      await result.current.composer.onSend();
    });

    expect(window.slashmd.chatSend).not.toHaveBeenCalled();
    expect(result.current.conversation.turns).toHaveLength(0);
  });
});
