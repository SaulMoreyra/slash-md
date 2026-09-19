import { MENTION_PATTERN } from "@slash-md/agents/context";
import type { ChatHostEvent } from "@slash-md/agents/types";
import { ChatRole, TurnStatus } from "./enums";
import type { ChatTurn } from "./types";

export function newTurn(role: ChatRole, text = ""): ChatTurn {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    thinking: "",
    tools: [],
    status: TurnStatus.Done,
  };
}

export function newAgentTurn(): ChatTurn {
  return { ...newTurn(ChatRole.Agent), status: TurnStatus.Streaming };
}

/** Fold one host event into a turn. `editStream` is owned by the page writer. */
export function applyHostEvent(turn: ChatTurn, event: ChatHostEvent): ChatTurn {
  switch (event.type) {
    case "started":
      return { ...turn, status: TurnStatus.Streaming };
    case "delta":
      return { ...turn, text: turn.text + event.text, status: TurnStatus.Streaming };
    case "thinking":
      return { ...turn, thinking: turn.thinking + event.text, status: TurnStatus.Streaming };
    case "tool":
      return {
        ...turn,
        tools: [...turn.tools, { name: event.name, brief: event.brief }],
        status: TurnStatus.Streaming,
      };
    case "editStream":
      return turn;
    case "done":
      return { ...turn, status: TurnStatus.Done };
    case "error":
      return { ...turn, status: TurnStatus.Error, error: event.message };
  }
}

export function replaceTurn(
  turns: ChatTurn[],
  id: string,
  update: (turn: ChatTurn) => ChatTurn,
): ChatTurn[] {
  const index = turns.findIndex((turn) => turn.id === id);
  if (index < 0) {
    return turns;
  }
  const next = [...turns];
  next[index] = update(next[index]);
  return next;
}

export function isSettled(event: ChatHostEvent): boolean {
  return event.type === "done" || event.type === "error";
}

/** Drop exactly the `@path` tokens that match `path`, keeping the sentence intact. */
export function removeMentionToken(draft: string, path: string): string {
  let next = "";
  let lastIndex = 0;
  for (const match of draft.matchAll(MENTION_PATTERN)) {
    if (match[1] === path) {
      next += draft.slice(lastIndex, match.index);
      lastIndex = match.index + match[0].length;
    }
  }
  return next + draft.slice(lastIndex);
}
