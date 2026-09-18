import type { ChatRole, TurnStatus } from "./enums";

export type ChatToolNote = {
  name: string;
  brief?: string;
};

export type ChatTurn = {
  id: string;
  role: ChatRole;
  text: string;
  thinking: string;
  tools: ChatToolNote[];
  status: TurnStatus;
  error?: string;
};
