import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_STORAGE_CHANGED_EVENT, listChatSessions, deleteChatSession } from "../../chat/chatStorage";
import type { ChatSessionMeta } from "../../chat/chatStorage";

const FRESH_THREAD_PREFIX = "thread:";

/** A brand-new (unsaved) thread lives under its own context key until persisted. */
export function newFreshContextKey(): string {
  return `${FRESH_THREAD_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAgentChatController() {
  const [sessions, setSessions] = useState<ChatSessionMeta[]>(() => listChatSessions());
  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    const latest = listChatSessions()[0];
    return latest?.contextKey ?? null;
  });
  const selectedKeyRef = useRef(selectedKey);
  selectedKeyRef.current = selectedKey;

  const refresh = useCallback(() => setSessions(listChatSessions()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(CHAT_STORAGE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHAT_STORAGE_CHANGED_EVENT, refresh);
  }, [refresh]);

  /** Start a brand-new thread: give it a fresh key right away so it persists once typed. */
  const onNew = useCallback(() => {
    setSelectedKey(newFreshContextKey());
  }, []);

  const onSelect = useCallback((contextKey: string) => {
    setSelectedKey(contextKey);
  }, []);

  const onDelete = useCallback(
    (contextKey: string) => {
      deleteChatSession(contextKey);
      setSessions(listChatSessions());
      if (selectedKeyRef.current === contextKey) {
        const next = listChatSessions()[0];
        setSelectedKey(next?.contextKey ?? null);
      }
    },
    [],
  );

  return {
    sessions,
    selectedKey,
    onNew,
    onSelect,
    onDelete,
    refresh,
  };
}

export type AgentChatController = ReturnType<typeof useAgentChatController>;