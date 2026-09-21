import { ChatScope } from "@slash-md/agents/types";
import { ChatRole, TurnStatus } from "./enums";
import type { ChatToolNote, ChatTurn } from "./types";

export type ChatStoredSession = {
  draft: string;
  turns: ChatTurn[];
  agent: string | null;
};

/** Persisted record: adds a write-time timestamp for the history index. */
export type ChatSessionMeta = {
  contextKey: string;
  scope: ChatScope;
  path: string | null;
  title: string;
  updatedAt: string;
  turnsCount: number;
  agent: string | null;
};

type StoredRecord = ChatStoredSession & { updatedAt?: string };

const STORAGE_PREFIX = "slashmd:chat:v1:";
const MAX_TURNS = 50;
const TITLE_MAX = 60;
const PAGE_PREFIX = "page:";

/** Dispatch a brief event when a thread is written/removed so the history tab can refresh. */
export const CHAT_STORAGE_CHANGED_EVENT = "slashmd:chat:storage-changed";

function notifyStorageChanged() {
  try {
    window.dispatchEvent(new Event(CHAT_STORAGE_CHANGED_EVENT));
  } catch {
    // environment without window (SSR/tests)
  }
}

export function chatStorageKey(contextKey: string): string {
  return `${STORAGE_PREFIX}${contextKey}`;
}

const EMPTY: ChatStoredSession = { draft: "", turns: [], agent: null };

/** Restore a thread; corrupt or oversized payloads degrade to a fresh session. */
export function loadChatSession(contextKey: string): ChatStoredSession {
  try {
    const raw = window.localStorage.getItem(chatStorageKey(contextKey));
    if (!raw) {
      return EMPTY;
    }
    const parsed = JSON.parse(raw) as Partial<ChatStoredSession>;
    return {
      draft: typeof parsed.draft === "string" ? parsed.draft : "",
      agent: typeof parsed.agent === "string" ? parsed.agent : null,
      turns: normalizeTurns(parsed.turns),
    };
  } catch {
    return EMPTY;
  }
}

export function saveChatSession(contextKey: string, session: ChatStoredSession): void {
  try {
    window.localStorage.setItem(
      chatStorageKey(contextKey),
      JSON.stringify({
        draft: session.draft,
        agent: session.agent,
        turns: normalizeTurns(session.turns),
        updatedAt: new Date().toISOString(),
      }),
    );
    notifyStorageChanged();
  } catch {
    // storage unavailable: keep the in-memory session only
  }
}

export function clearChatSession(contextKey: string): void {
  try {
    window.localStorage.removeItem(chatStorageKey(contextKey));
    notifyStorageChanged();
  } catch {
    // storage unavailable
  }
}

/** Index every stored thread, newest first, for the AgentChat history tab. */
export function listChatSessions(): ChatSessionMeta[] {
  const sessions: ChatSessionMeta[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(STORAGE_PREFIX)) {
        continue;
      }
      const contextKey = key.slice(STORAGE_PREFIX.length);
      const record = readStoredRecord(key);
      if (!record) {
        continue;
      }
      const turns = normalizeTurns(record.turns);
      sessions.push(sessionMeta(contextKey, record, turns));
    }
  } catch {
    // storage unavailable: absent index
  }
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteChatSession(contextKey: string): void {
  clearChatSession(contextKey);
}

/** Derive the history preview from the first user turn (like agent-chat-ui's firstMessage). */
export function sessionTitle(turns: ChatTurn[]): string {
  const first = turns.find((turn) => turn.role === ChatRole.User);
  if (!first) {
    return "";
  }
  const trimmed = first.text.trim().replace(/\s+/g, " ");
  return trimmed.length > TITLE_MAX ? `${trimmed.slice(0, TITLE_MAX - 1)}…` : trimmed;
}

/** "page:<path>" sessions stay page-scoped; every other key is a global thread. */
export function sessionScopeAndPath(contextKey: string): {
  scope: ChatScope;
  path: string | null;
} {
  if (contextKey.startsWith(PAGE_PREFIX)) {
    return { scope: ChatScope.Page, path: contextKey.slice(PAGE_PREFIX.length) };
  }
  return { scope: ChatScope.Global, path: null };
}

function readStoredRecord(storageKey: string): StoredRecord | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredRecord>;
    return {
      draft: typeof parsed.draft === "string" ? parsed.draft : "",
      agent: typeof parsed.agent === "string" ? parsed.agent : null,
      turns: normalizeTurns(parsed.turns),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

function sessionMeta(
  contextKey: string,
  record: StoredRecord,
  turns: ChatTurn[],
): ChatSessionMeta {
  const anchored = record.updatedAt || new Date(0).toISOString();
  const { scope, path } = sessionScopeAndPath(contextKey);
  return {
    contextKey,
    scope,
    path,
    title: sessionTitle(turns) || contextKey,
    updatedAt: anchored,
    turnsCount: turns.length,
    agent: record.agent,
  };
}

/** Coerce unknown input into a bounded, render-safe turn list. */
function normalizeTurns(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(isStorableTurn)
    .slice(-MAX_TURNS)
    .map((turn) => ({
      id: turn.id,
      role: turn.role,
      text: typeof turn.text === "string" ? turn.text : "",
      thinking: typeof turn.thinking === "string" ? turn.thinking : "",
      tools: Array.isArray(turn.tools) ? turn.tools.filter(isToolNote) : [],
      // A restored turn can never stream: its host session is gone.
      status:
        turn.status === TurnStatus.Error ? TurnStatus.Error : TurnStatus.Done,
      ...(typeof turn.error === "string" ? { error: turn.error } : {}),
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStorableTurn(
  value: unknown,
): value is Record<string, unknown> & { id: string; role: ChatRole } {
  return isRecord(value) && typeof value.id === "string" && isRole(value.role);
}

function isRole(value: unknown): value is ChatRole {
  return value === ChatRole.User || value === ChatRole.Agent;
}

function isToolNote(value: unknown): value is ChatToolNote {
  return (
    typeof value === "object" && value !== null && typeof (value as ChatToolNote).name === "string"
  );
}