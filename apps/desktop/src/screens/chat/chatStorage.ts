import { ChatRole, TurnStatus } from "./enums";
import type { ChatToolNote, ChatTurn } from "./types";

export type ChatStoredSession = {
  draft: string;
  turns: ChatTurn[];
  agent: string | null;
};

const STORAGE_PREFIX = "slashmd:chat:v1:";
const MAX_TURNS = 50;

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
      }),
    );
  } catch {
    // storage unavailable: keep the in-memory session only
  }
}

export function clearChatSession(contextKey: string): void {
  try {
    window.localStorage.removeItem(chatStorageKey(contextKey));
  } catch {
    // storage unavailable
  }
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