import type { AgentRecipe } from "./types";

/**
 * Documented launch recipes for headless streaming mode. These agents are MCP
 * *clients*, not servers: the supported way to drive them from an app is one
 * prompt in, NDJSON events out. MCP applies to the inverse direction (Slash as
 * a tools server, phase 2).
 */
export const AGENT_PRESETS: AgentRecipe[] = [
  {
    name: "opencode",
    label: "opencode",
    command: "opencode",
    args: ["run", "--format", "json"],
    docsUrl: "https://dev.opencode.ai/docs/cli/",
  },
  {
    name: "claude",
    label: "Claude Code",
    command: "claude",
    args: ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages"],
    docsUrl: "https://code.claude.com/docs/en/headless",
  },
  {
    name: "codex",
    label: "Codex",
    command: "codex",
    args: ["exec", "--json"],
    docsUrl: "https://github.com/openai/codex",
  },
];

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
