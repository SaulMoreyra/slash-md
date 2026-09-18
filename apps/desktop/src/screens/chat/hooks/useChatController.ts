import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatMode,
  ChatScope,
  type AgentInfo,
  type ChatHostEvent,
  type ChatRequest,
} from "@slash-md/agents/types";
import { extractMentions, stripMentions } from "@slash-md/agents/context";
import { ChatRole, TurnStatus } from "../enums";
import { loadChatSession, saveChatSession } from "../chatStorage";
import type { ChatEditApi, ChatTurn } from "../types";
import { applyHostEvent, isSettled, newAgentTurn, newTurn, replaceTurn } from "../utils";

const api = () => window.slashmd;

const PERSIST_DEBOUNCE_MS = 250;

export type ChatControllerParams = {
  scope: ChatScope;
  mode: ChatMode;
  path?: string;
  getBuffer?: () => string;
  /** Resolves the page editor handle *at session start* (the bubble follows the active page). */
  getEditApi?: () => ChatEditApi | null;
  /** localStorage context key: the thread + draft survive close/restarts and swap per context. */
  storageKey?: string;
};

export function useChatController({
  scope,
  mode,
  path,
  getBuffer,
  getEditApi,
  storageKey,
}: ChatControllerParams) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);

  const sessionRef = useRef<string | null>(null);
  const pendingRef = useRef(false);
  const agentTurnRef = useRef<string | null>(null);
  const editApiRef = useRef<ChatEditApi | null>(null);

  const paramsRef = useRef({ scope, mode, path, getBuffer, getEditApi, storageKey });
  paramsRef.current = { scope, mode, path, getBuffer, getEditApi, storageKey };

  // Live mirrors for persistence flushed on context switch / unmount.
  const latestRef = useRef({ draft, turns, agent: null as string | null, storageKey });
  const streamingRef = useRef(streaming);
  latestRef.current = { draft, turns, agent: agentName, storageKey };
  streamingRef.current = streaming;

  useEffect(() => {
    let alive = true;
    void api()
      ?.chatListAgents?.()
      .then((list) => {
        if (!alive) {
          return;
        }
        setAgents(list);
        setAgentName(
          (current) => current ?? list.find((agent) => agent.available)?.name ?? list[0]?.name ?? null,
        );
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const handleEvent = useCallback((event: ChatHostEvent) => {
    const turnId = agentTurnRef.current;
    if (!turnId) {
      return;
    }
    if (event.type === "editStream") {
      editApiRef.current?.onEditStream(event.markdown);
    }
    setTurns((prev) => replaceTurn(prev, turnId, (turn) => applyHostEvent(turn, event)));
    if (isSettled(event)) {
      setStreaming(false);
      pendingRef.current = false;
      sessionRef.current = null;
      editApiRef.current?.onEditStop();
      editApiRef.current = null;
    }
  }, []);

  useEffect(() => {
    const subscribe = api()?.onChatEvent;
    if (!subscribe) {
      return undefined;
    }
    return subscribe((message) => {
      if (sessionRef.current !== null) {
        if (message.sessionId !== sessionRef.current) {
          return;
        }
      } else if (pendingRef.current) {
        sessionRef.current = message.sessionId;
      } else {
        return;
      }
      handleEvent(message.event);
    });
  }, [handleEvent]);

  /** Set while a restored thread is landing so the debounce skips the stale render's values. */
  const justSwappedRef = useRef(false);

  /** Swap the persisted thread when the active context changes; abort mid-flight sessions. */
  const activeStorageKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const previous = activeStorageKeyRef.current;
    activeStorageKeyRef.current = storageKey ?? null;
    justSwappedRef.current = previous !== storageKey;
    if (previous === storageKey) {
      return;
    }
    if (previous) {
      const snapshot = latestRef.current;
      saveChatSession(previous, {
        draft: snapshot.draft,
        turns: snapshot.turns,
        agent: snapshot.agent,
      });
    }
    if (streamingRef.current) {
      const sessionId = sessionRef.current;
      if (sessionId) {
        void api().chatAbort(sessionId);
      }
      setStreaming(false);
      pendingRef.current = false;
      sessionRef.current = null;
      agentTurnRef.current = null;
      editApiRef.current?.onEditStop();
      editApiRef.current = null;
    }
    if (!storageKey) {
      setDraft("");
      setTurns([]);
      return;
    }
    const stored = loadChatSession(storageKey);
    setDraft(stored.draft);
    setTurns(stored.turns);
    setAgentName((current) => stored.agent ?? current);
  }, [storageKey]);

  /** Debounced live persistence so a crash/restart keeps the latest draft + thread. */
  useEffect(() => {
    if (!storageKey) {
      return undefined;
    }
    if (justSwappedRef.current) {
      justSwappedRef.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      saveChatSession(storageKey, { draft, turns, agent: agentName });
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, turns, agentName, storageKey]);

  /** Flush right before the panel unmounts (the bubble closes). */
  useEffect(() => {
    return () => {
      const snapshot = latestRef.current;
      if (snapshot.storageKey) {
        saveChatSession(snapshot.storageKey, {
          draft: snapshot.draft,
          turns: snapshot.turns,
          agent: snapshot.agent,
        });
      }
    };
  }, []);

  const startSession = useCallback(
    async (request: ChatRequest, userText: string, turn: ChatTurn) => {
      agentTurnRef.current = turn.id;
      setTurns((prev) => [...prev, newTurn(ChatRole.User, userText), turn]);
      setDraft("");
      setStreaming(true);
      pendingRef.current = true;
      try {
        const { sessionId } = await api().chatSend(request);
        sessionRef.current = sessionId;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStreaming(false);
        pendingRef.current = false;
        setTurns((prev) =>
          replaceTurn(prev, turn.id, (current) => ({
            ...current,
            status: TurnStatus.Error,
            error: message,
          })),
        );
        editApiRef.current?.onEditStop();
        editApiRef.current = null;
      }
    },
    [],
  );

  const onSend = useCallback(async () => {
    const current = paramsRef.current;
    const prompt = stripMentions(draft);
    if (!prompt || streaming) {
      return;
    }
    await startSession(
      {
        scope: current.scope,
        mode: current.mode,
        prompt,
        path: current.path,
        bufferMarkdown: current.scope === ChatScope.Page ? current.getBuffer?.() : undefined,
        agent: agentName ?? undefined,
        references: extractMentions(draft),
      },
      draft.trim(),
      newAgentTurn(),
    );
  }, [draft, streaming, agentName, startSession]);

  const onRewrite = useCallback(async () => {
    const current = paramsRef.current;
    const prompt = stripMentions(draft);
    if (!prompt || streaming || current.scope !== ChatScope.Page || !current.path) {
      return;
    }
    editApiRef.current = current.getEditApi?.() ?? null;
    editApiRef.current?.onEditStart();
    await startSession(
      {
        scope: current.scope,
        mode: ChatMode.EditPage,
        prompt,
        path: current.path,
        bufferMarkdown: current.getBuffer?.(),
        agent: agentName ?? undefined,
        references: extractMentions(draft),
      },
      draft.trim(),
      newAgentTurn(),
    );
  }, [draft, streaming, agentName, startSession]);

  const onAbort = useCallback(() => {
    const sessionId = sessionRef.current;
    if (sessionId) {
      void api().chatAbort(sessionId);
    }
    setStreaming(false);
    pendingRef.current = false;
    sessionRef.current = null;
    setTurns((prev) =>
      agentTurnRef.current
        ? replaceTurn(prev, agentTurnRef.current, (turn) => ({ ...turn, status: TurnStatus.Done }))
        : prev,
    );
    editApiRef.current?.onEditStop();
    editApiRef.current = null;
  }, []);

  const onClear = useCallback(() => {
    if (streaming) {
      return;
    }
    setTurns([]);
    const current = paramsRef.current;
    if (current.storageKey) {
      saveChatSession(current.storageKey, { draft, turns: [], agent: agentName });
    }
  }, [streaming, draft, agentName]);

  const onSelectAgent = useCallback(
    (name: string) => {
      if (!streaming) {
        setAgentName(name);
      }
    },
    [streaming],
  );

  const onOpenLink = useCallback((href: string) => {
    void api()?.openUrl?.(href);
  }, []);

  return {
    agents: { items: agents, selected: agentName, onSelect: onSelectAgent },
    conversation: { turns, streaming, onAbort, onClear },
    composer: {
      draft,
      canSend: draft.trim().length > 0 && !streaming,
      onDraftChange: (value: string) => setDraft(value),
      onSend,
    },
    rewrite: {
      onRewrite,
      streaming,
    },
    onOpenLink,
  };
}