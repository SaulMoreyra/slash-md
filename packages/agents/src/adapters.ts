import type { AgentProbeResult, AgentRecipe } from "./types";

/**
 * Documented launch recipes for headless streaming mode. These agents are MCP
 * *clients*, not servers: the supported way to drive them from an app is one
 * prompt in, NDJSON events out. MCP applies to the inverse direction (Slash as
 * a tools server, phase 2).
 *
 * `login`/`probe` describe how the host can sign the user in (no TTY) and later
 * probe whether the agent is authenticated. Reused by the desktop app.
 */
export const AGENT_PRESETS: AgentRecipe[] = [
  {
    name: "opencode",
    label: "opencode",
    command: "opencode",
    args: ["run", "--format", "json"],
    docsUrl: "https://dev.opencode.ai/docs/cli/",
    login: {
      command: "opencode",
      args: ["providers", "login"],
      openUrl: true,
      pasteKey: {
        providers: [
          { id: "opencode", label: "OpenCode Zen" },
          { id: "opencode-go", label: "OpenCode Go" },
          { id: "nvidia", label: "NVIDIA (Build)" },
          { id: "openai", label: "OpenAI" },
          { id: "anthropic", label: "Anthropic" },
          { id: "google", label: "Google" },
        ],
      },
    },
    probe: {
      kind: "command",
      command: "opencode",
      args: ["providers", "list"],
      then: parseOpencodeCreds,
    },
  },
  {
    name: "claude",
    label: "Claude Code",
    command: "claude",
    args: ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages"],
    docsUrl: "https://code.claude.com/docs/en/headless",
    login: {
      command: "claude",
      args: ["auth", "login"],
      openUrl: true,
    },
    probe: {
      kind: "command",
      command: "claude",
      args: ["auth", "status", "--json"],
      then: parseJsonLoggedIn,
    },
  },
  {
    name: "codex",
    label: "Codex",
    command: "codex",
    args: ["exec", "--json"],
    docsUrl: "https://github.com/openai/codex",
    login: {
      command: "codex",
      args: ["login"],
      openUrl: true,
    },
    probe: {
      kind: "command",
      command: "codex",
      args: ["login", "status", "--format", "json"],
      then: parseJsonLoggedIn,
    },
  },
  {
    name: "cursor",
    label: "Cursor CLI",
    command: "agent",
    args: ["-p", "--output-format", "stream-json", "--stream-partial-output"],
    docsUrl: "https://cursor.com/docs/cli/reference/output-format",
    login: {
      command: "agent",
      args: ["login"],
      env: { NO_OPEN_BROWSER: "1" },
      openUrl: true,
    },
    probe: {
      kind: "command",
      command: "agent",
      args: ["--list-models"],
      then: parseCursorAuth,
    },
  },
];

/** True when the JSON status the agent printed says `loggedIn: true`. */
export function parseJsonLoggedIn(result: AgentProbeResult): boolean | null {
  for (const text of [result.stdout, result.stderr]) {
    const obj = firstJsonObject(text);
    if (!obj) {
      continue;
    }
    if (typeof obj.loggedIn === "boolean") {
      return obj.loggedIn;
    }
    if (obj.is_logged_in === true || obj.authenticated === true) {
      return true;
    }
  }
  return null;
}

/**
 * opencode stores its credentials in `~/.local/share/opencode/auth.json`; a
 * non-empty file can still be missing the provider a model needs (and the file
 * also holds login tokens for hosted auth). The honest signal is `providers
 * list`, which renders one `● Name  type` row per usable credential.
 */
export function parseOpencodeCreds(result: AgentProbeResult): boolean | null {
  if (result.code !== 0) {
    return null;
  }
  const text = result.stdout + result.stderr;
  if (!isCredentialList(text)) {
    return null;
  }
  return text.split("\n").some((line) => /●\s+\S+/.test(line));
}

/** Strip ANSI SGR sequences without embedding control escapes in a regex literal. */
const ESCAPE = String.fromCharCode(27);
function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${ESCAPE}\\[[0-9;?]*[a-zA-Z]`, "g"), "");
}

/** True when the output looks like opencode's credential list (even if empty). */
function isCredentialList(text: string): boolean {
  const haystack = stripAnsi(text);
  return /Credentials/i.test(haystack) || /auth\.json/i.test(haystack);
}

/**
 * Cursor's `agent` has no status command: a cheap `--list-models` call fails
 * with an auth error when signed out, so use exit code + that phrasing.
 */
export function parseCursorAuth(result: AgentProbeResult): boolean | null {
  if (result.code === 0) {
    return true;
  }
  const haystack = `${result.stdout}\n${result.stderr}`;
  if (/(authentication required|not logged\s?in|please run ['"]?agent login)/i.test(haystack)) {
    return false;
  }
  return null;
}

function firstJsonObject(text: string): Record<string, unknown> | undefined {
  const start = text.indexOf("{");
  const end = text.indexOf("}", start);
  if (start === -1 || end === -1) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export function findAgentPreset(name: string): AgentRecipe | undefined {
  const normalized = name.trim().toLowerCase();
  return AGENT_PRESETS.find((preset) => preset.name === normalized);
}

/** Low-level event extracted from one NDJSON line, before aggregation. */
export type AgentLineEvent =
  | { kind: "delta"; text: string; channel: "text" | "thinking" }
  /** A complete text part (non-streaming agents); aggregated by the reducer. */
  | { kind: "fullText"; text: string }
  | { kind: "tool"; name: string; brief?: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

export function parseAgentLine(agent: string, raw: string): AgentLineEvent[] {
  const line = raw.trim();
  if (!line || line[0] !== "{") {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return [];
  }
  const msg = asRecord(parsed);
  if (!msg) {
    return [];
  }
  if (agent === "opencode") {
    return parseOpencodeLine(msg);
  }
  if (agent === "claude") {
    return parseClaudeLine(msg);
  }
  if (agent === "cursor") {
    return parseCursorLine(msg);
  }
  return parseGenericLine(msg);
}

function parseOpencodeLine(msg: Record<string, unknown>): AgentLineEvent[] {
  const type = str(msg.type);
  switch (type) {
    case "delta": {
      const text = str(msg.text) ?? str(msg.delta) ?? str(asRecord(msg.part)?.text);
      return text ? [{ kind: "delta", text, channel: "text" }] : [];
    }
    case "text": {
      const text = str(msg.text) ?? str(asRecord(msg.part)?.text);
      return text ? [{ kind: "fullText", text }] : [];
    }
    case "reasoning": {
      const text = str(msg.text) ?? str(msg.delta);
      return text ? [{ kind: "delta", text, channel: "thinking" }] : [];
    }
    case "tool": {
      const part = asRecord(msg.part);
      const name = str(part?.tool) ?? str(msg.tool);
      const brief = str(asRecord(part?.state)?.title) ?? str(msg.brief);
      return name ? [{ kind: "tool", name, brief }] : [];
    }
    case "tool_error":
    case "tool-error": {
      return [{ kind: "error", message: str(msg.message) ?? errorText(msg) ?? "Tool error" }];
    }
    case "error": {
      return [{ kind: "error", message: str(msg.message) ?? errorText(msg) ?? "Agent error" }];
    }
    case "step_finish":
    case "step-finish": {
      return [{ kind: "done" }];
    }
    default:
      return [];
  }
}

function parseClaudeLine(msg: Record<string, unknown>): AgentLineEvent[] {
  const type = str(msg.type);
  if (type === "stream_event") {
    const event = asRecord(msg.event);
    const eventType = str(event?.type);
    if (eventType === "content_block_delta") {
      const delta = asRecord(event?.delta);
      const text = str(delta?.text);
      if (!text) {
        return [];
      }
      if (str(delta?.type) === "thinking_delta") {
        return [{ kind: "delta", text, channel: "thinking" }];
      }
      return [{ kind: "delta", text, channel: "text" }];
    }
    if (eventType === "content_block_start") {
      const block = asRecord(event?.content_block);
      if (str(block?.type) === "tool_use") {
        return [{ kind: "tool", name: str(block?.name) ?? "tool" }];
      }
    }
    return [];
  }
  if (type === "assistant") {
    const message = asRecord(msg.message);
    const content = Array.isArray(message?.content) ? message.content : [];
    const events: AgentLineEvent[] = [];
    for (const block of content) {
      const rec = asRecord(block);
      if (str(rec?.type) === "tool_use") {
        events.push({ kind: "tool", name: str(rec?.name) ?? "tool" });
      }
    }
    return events;
  }
  if (type === "result") {
    if (msg.is_error === true) {
      return [{ kind: "error", message: str(msg.result) ?? str(msg.subtype) ?? "Agent error" }];
    }
    return [{ kind: "done" }];
  }
  return [];
}

function parseCursorLine(msg: Record<string, unknown>): AgentLineEvent[] {
  const type = str(msg.type);
  if (type === "system") {
    return [];
  }
  if (type === "assistant") {
    const message = asRecord(msg.message);
    const content = Array.isArray(message?.content) ? message.content : [];
    const text = str(asRecord(content[0])?.text) ?? str(msg.message_text);
    if (!text) {
      return [];
    }
    const hasTs = msg.timestamp_ms != null;
    const hasMc = msg.model_call_id != null;
    if (hasTs && !hasMc) {
      return [{ kind: "delta", text, channel: "text" }];
    }
    return [];
  }
  if (type === "tool_call") {
    const tool = asRecord(msg.tool_call);
    const write = asRecord(tool?.writeToolCall);
    const read = asRecord(tool?.readToolCall);
    const name = str(write?.name) ?? str(read?.name) ?? str(write?.function) ?? str(read?.function) ?? "tool";
    const brief = str(asRecord(write?.args)?.path) ?? str(asRecord(read?.args)?.path);
    return [{ kind: "tool", name, brief }];
  }
  if (type === "result") {
    if (msg.is_error === true || msg.exit_code != null && msg.exit_code !== 0) {
      return [{ kind: "error", message: str(msg.result) ?? "Agent error" }];
    }
    return [{ kind: "done" }];
  }
  return [];
}

function parseGenericLine(msg: Record<string, unknown>): AgentLineEvent[] {
  const type = str(msg.type);
  if (type === "delta" || type === "text" || type === "message") {
    const text = str(msg.text) ?? str(msg.delta);
    if (!text) {
      return [];
    }
    return type === "delta" ? [{ kind: "delta", text, channel: "text" }] : [{ kind: "fullText", text }];
  }
  if (type === "thinking" || type === "reasoning") {
    const text = str(msg.text) ?? str(msg.delta);
    return text ? [{ kind: "delta", text, channel: "thinking" }] : [];
  }
  if (type === "tool") {
    const name = str(msg.name) ?? str(msg.tool);
    return name ? [{ kind: "tool", name }] : [];
  }
  if (type === "error") {
    return [{ kind: "error", message: str(msg.message) ?? "Agent error" }];
  }
  if (type === "done" || type === "result") {
    return [{ kind: "done" }];
  }
  return [];
}

function errorText(msg: Record<string, unknown>): string | undefined {
  return str(asRecord(msg.error)?.message) ?? str(msg.error);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
