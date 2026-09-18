import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatMode,
  ChatScope,
  type AgentInfo,
  type ChatHostEvent,
  type ChatRequest,
} from "@slash-md/agents/types";
import { ChatRole, TurnStatus } from "../enums";
import type { ChatTurn } from "../types";
import { applyHostEvent, isSettled, newAgentTurn, newTurn, replaceTurn } from "../utils";

const api = () => window.slashmd;

export type ChatControllerParams = {
  scope: ChatScope;
  mode: ChatMode;
  path?: string;
  getBuffer?: () => string;
  onEditStart?: () => void;
  onEditStream?: (markdown: string) => void;
  onEditStop?: () => void;
};

export function useChatController({
  scope,
  mode,
  path,
  getBuffer,
  onEditStart,
  onEditStream,
  onEditStop,
}: ChatControllerParams) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);

  const sessionRef = useRef<string | null>(null);
  const pendingRef = useRef(false);
  const agentTurnRef = useRef<string | null>(null);
  const editModeRef = useRef(false);

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

  const handleEvent = useCallback(
    (event: ChatHostEvent) => {
      const turnId = agentTurnRef.current;
      if (!turnId) {
        return;
      }
      if (event.type === "editStream") {
        onEditStream?.(event.markdown);
      }
      setTurns((prev) => replaceTurn(prev, turnId, (turn) => applyHostEvent(turn, event)));
      if (isSettled(event)) {
        setStreaming(false);
        pendingRef.current = false;
        sessionRef.current = null;
        if (editModeRef.current) {
          editModeRef.current = false;
          onEditStop?.();
        }
      }
    },
    [onEditStream, onEditStop],
  );

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

  const startSession = useCallback(
    async (request: ChatRequest, turn: ChatTurn) => {
      agentTurnRef.current = turn.id;
      setTurns((prev) => [...prev, newTurn(ChatRole.User, request.prompt), turn]);
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
        if (editModeRef.current) {
          editModeRef.current = false;
          onEditStop?.();
        }
      }
    },
    [onEditStop],
  );

  const onSend = useCallback(async () => {
    const prompt = draft.trim();
    if (!prompt || streaming) {
      return;
    }
    await startSession(
      {
        scope,
        mode,
        prompt,
        path,
        bufferMarkdown: scope === ChatScope.Page ? getBuffer?.() : undefined,
        agent: agentName ?? undefined,
      },
      newAgentTurn(),
    );
  }, [draft, streaming, scope, mode, path, getBuffer, agentName, startSession]);

  const onRewrite = useCallback(async () => {
    const prompt = draft.trim();
    if (!prompt || streaming || scope !== ChatScope.Page || !path) {
      return;
    }
    editModeRef.current = true;
    onEditStart?.();
    await startSession(
      {
        scope,
        mode: ChatMode.EditPage,
        prompt,
        path,
        bufferMarkdown: getBuffer?.(),
        agent: agentName ?? undefined,
      },
      newAgentTurn(),
    );
  }, [draft, streaming, scope, path, getBuffer, agentName, startSession, onEditStart]);

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
    if (editModeRef.current) {
      editModeRef.current = false;
      onEditStop?.();
    }
  }, [onEditStop]);

  const onClear = useCallback(() => {
    if (streaming) {
      return;
    }
    setTurns([]);
  }, [streaming]);

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
