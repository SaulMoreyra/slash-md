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
  /** Repo-relative markdown paths `@`-mentioned in the prompt; bodies are inlined as context. */
  references?: string[];
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
  /** Manual sign-in command to show when in-app login is not possible. */
  loginCommand?: string;
  /** When true the renderer offers a paste-API-key form instead of the background login. */
  loginPasteKey?: boolean;
  /** Provider ids (+labels) offered in that paste form. */
  loginProviders?: { id: string; label: string }[];
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
  /** Interactive sign-in command, launched by the host (no TTY available). */
  login?: AgentLoginRecipe;
  /**
   * How the host can tell whether the agent is already authenticated.
   * Agents without a probe report `loggedIn: null` (unknown).
   */
  probe?: AgentProbeRecipe;
};

/** How to run an interactive agent sign-in without a TTY. */
export type AgentLoginRecipe = {
  command: string;
  args: string[];
  /** Extra env for the login process (e.g. NO_OPEN_BROWSER=1). */
  env?: Record<string, string>;
  /** When true the host opens the first URL the login prints in the browser. */
  openUrl?: boolean;
  /**
   * Headless-compatible alternative: the host accepts a pasted API key and
   * writes it straight into the agent's credential file, instead of running an
   * interactive flow (opencode's `providers login` needs a TTY).
   */
  pasteKey?: { providers: { id: string; label: string }[] };
};

/** Exit/stdio result the probe parser inspects. */
export type AgentProbeResult = {
  stdout: string;
  stderr: string;
  code: number | null;
};

/** `true` authenticated, `false` signed out, `null` could not tell. */
export type AgentProbeParser = (result: AgentProbeResult) => boolean | null;

export type AgentProbeRecipe =
  | {
      kind: "command";
      command: string;
      args: string[];
      then: AgentProbeParser;
    }
  | {
      /** Login state derived from a well-known file (exists + non-empty). */
      kind: "file";
      paths: string[];
    };

/** Aggregated login state for one agent, resolved by the host. */
export type AgentLoginStatus = {
  name: string;
  available: boolean;
  /** `null` when there is no reliable way to tell (probe-less agents). */
  loggedIn: boolean | null;
  /** Human hint, e.g. the command to run manually when headless login fails. */
  detail?: string;
};

/** Push-channel frame from the host while an interactive login runs. */
export type AgentLoginEnvelope =
  | { agent: string; type: "line"; text: string }
  | { agent: string; type: "url"; url: string }
  | { agent: string; type: "done"; ok: boolean }
  | { agent: string; type: "error"; message: string };
