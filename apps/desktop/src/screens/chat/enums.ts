/** Who authored a chat turn. */
export const ChatRole = {
  User: "user",
  Agent: "agent",
} as const;

export type ChatRole = (typeof ChatRole)[keyof typeof ChatRole];

/** Lifecycle of one turn; drives the streaming cursor and error chrome. */
export const TurnStatus = {
  Streaming: "streaming",
  Done: "done",
  Error: "error",
} as const;

export type TurnStatus = (typeof TurnStatus)[keyof typeof TurnStatus];
