/** Where a chat session runs: workspace-level or attached to one page. */
export const ChatScope = {
  Global: "global",
  Page: "page",
} as const;

export type ChatScope = (typeof ChatScope)[keyof typeof ChatScope];

/** What the agent should produce: prose chat or a full replacement of the page body. */
export const ChatMode = {
  Chat: "chat",
  EditPage: "editPage",
} as const;

export type ChatMode = (typeof ChatMode)[keyof typeof ChatMode];

/** One turn request sent from the renderer to the host. */
export type ChatRequest = {
  scope: ChatScope;
  mode: ChatMode;
  prompt: string;
  /** Repo-relative page path; required for page scope. */
  path?: string;
  /** Live editor buffer (unsaved); preferred over the on-disk page when present. */
  bufferMarkdown?: string;
  /** Preferred agent name; falls back to `.slashmd.json` / PATH probe. */
  agent?: string;
};

/** Normalized agent stream events, pushed from the host to the renderer. */
export type ChatHostEvent =
  | { type: "started"; agent: string }
  | { type: "delta"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool"; name: string; brief?: string }
  /** Accumulated markdown snapshot while editing the open page. */
  | { type: "editStream"; markdown: string }
  | { type: "done"; code: number | null }
  | { type: "error"; message: string; code?: string };

/** Push-channel frame: which session an event belongs to. */
export type ChatEnvelope = { sessionId: string; event: ChatHostEvent };

/** An agent the chat can drive. `available` is resolved by the host (PATH probe). */
export type AgentInfo = {
  name: string;
  label: string;
  command: string;
  available: boolean;
};

/** How to invoke one CLI agent in headless streaming mode. */
export type AgentRecipe = {
  name: string;
  label: string;
  command: string;
  /** Args placed before the prompt. */
  args: string[];
  /** When true the prompt is written to stdin instead of argv. */
  promptViaStdin?: boolean;
  docsUrl?: string;
};
