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

/** Live-facing callbacks of the page editor consumed during an edit session. */
export type ChatEditApi = {
  onEditStart: () => void;
  onEditStream: (markdown: string) => void;
  onEditStop: () => void;
};

/** Imperative handle the active editor exposes to the single chat bubble. */
export type PageChatHost = {
  /** Live (unsaved) markdown of the page buffer. */
  getMarkdown: () => string;
  edit: ChatEditApi;
};

/** Ref-backed map from repo-relative page path to its host (no re-renders). */
export type PageChatHostRegistry = {
  register: (path: string, host: PageChatHost) => void;
  unregister: (path: string) => void;
  get: (path: string) => PageChatHost | null;
};
