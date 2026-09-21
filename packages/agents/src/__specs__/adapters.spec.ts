import { describe, expect, it } from "vitest";
import {
  AGENT_PRESETS,
  findAgentPreset,
  parseAgentLine,
  parseCursorAuth,
  parseJsonLoggedIn,
  parseOpencodeCreds,
} from "../adapters";

describe("AGENT_PRESETS", () => {
  it("exposes streaming recipes without embedding the prompt", () => {
    for (const preset of AGENT_PRESETS) {
      expect(preset.args.join(" ")).not.toContain("{{prompt}}");
      expect(preset.command).toBeTruthy();
    }
  });

  it("resolves a preset by name, case-insensitively", () => {
    expect(findAgentPreset("Claude")?.command).toBe("claude");
    expect(findAgentPreset("nope")).toBeUndefined();
  });

  it("pairs every preset with a login recipe", () => {
    for (const preset of AGENT_PRESETS) {
      expect(preset.login?.command).toBe(preset.command);
      expect(preset.login?.args.length).toBeGreaterThan(0);
    }
  });

  it("ships a probe for every preset", () => {
    for (const preset of AGENT_PRESETS) {
      expect(preset.probe?.kind).toBeTruthy();
    }
  });
});

describe("parseJsonLoggedIn", () => {
  it("reads claude auth status", () => {
    expect(parseJsonLoggedIn({ stdout: '{"loggedIn":false,"authMethod":"none"}', stderr: "", code: 0 })).toBe(
      false,
    );
    expect(parseJsonLoggedIn({ stdout: '{"loggedIn":true,"authMethod":"oauth"}', stderr: "", code: 0 })).toBe(
      true,
    );
  });

  it("reads codex login status", () => {
    expect(parseJsonLoggedIn({ stdout: '{"login":true,"loggedIn":true}', stderr: "", code: 0 })).toBe(true);
  });

  it("ignores preamble before the JSON object", () => {
    expect(
      parseJsonLoggedIn({ stdout: "welcome\n{\"loggedIn\":true}", stderr: "", code: 0 }),
    ).toBe(true);
  });

  it("returns null when the output is not a status payload", () => {
    expect(parseJsonLoggedIn({ stdout: "no idea", stderr: "", code: 1 })).toBeNull();
  });
});

describe("parseCursorAuth", () => {
  it("treats a clean exit as authenticated", () => {
    expect(parseCursorAuth({ stdout: "models\n", stderr: "", code: 0 })).toBe(true);
  });

  it("spots the sign-in error message", () => {
    const stderr = "Error: Authentication required. Please run 'agent login' first…";
    expect(parseCursorAuth({ stdout: "", stderr, code: 1 })).toBe(false);
  });

  it("returns null when the failure reason is unknown", () => {
    expect(parseCursorAuth({ stdout: "process exited", stderr: "", code: 1 })).toBeNull();
  });
});

describe("parseOpencodeCreds", () => {
  const boxed = "\x1B[0m\n┌  Credentials\n│\n│  ●  OpenCode Go api\n│  ●  GitHub Copilot oauth\n│\n└\n";

  it("reads credentials from `providers list` output", () => {
    expect(parseOpencodeCreds({ stdout: boxed, stderr: "", code: 0 })).toBe(true);
  });

  it("treats a credential list with no rows as signed out", () => {
    expect(parseOpencodeCreds({ stdout: "\x1B[0m\n┌  Credentials\n│\n└\n", stderr: "", code: 0 })).toBe(false);
  });

  it("ignores a non-credential table (e.g. provider picker)", () => {
    const picker = "\x1B[0m\n◆  Select provider\n│  ● OpenCode Zen (recommended)\n│  ○ OpenAI\n";
    expect(parseOpencodeCreds({ stdout: picker, stderr: "", code: 0 })).toBeNull();
  });

  it("returns null when the command failed", () => {
    expect(parseOpencodeCreds({ stdout: "", stderr: "command not found", code: 127 })).toBeNull();
  });
});

describe("parseAgentLine — opencode", () => {
  it("reads delta fragments", () => {
    expect(parseAgentLine("opencode", '{"type":"delta","text":"Hola"}')).toEqual([
      { kind: "delta", text: "Hola", channel: "text" },
    ]);
  });

  it("reads complete text parts as fullText", () => {
    expect(parseAgentLine("opencode", '{"type":"text","text":"Hola mundo"}')).toEqual([
      { kind: "fullText", text: "Hola mundo" },
    ]);
  });

  it("reads reasoning as a thinking delta", () => {
    expect(parseAgentLine("opencode", '{"type":"reasoning","text":"mmm"}')).toEqual([
      { kind: "delta", text: "mmm", channel: "thinking" },
    ]);
  });

  it("reads tool parts and step_finish", () => {
    expect(
      parseAgentLine("opencode", '{"type":"tool","part":{"tool":"read","state":{"title":"read a.md"}}}'),
    ).toEqual([{ kind: "tool", name: "read", brief: "read a.md" }]);
    expect(parseAgentLine("opencode", '{"type":"step_finish"}')).toEqual([{ kind: "done" }]);
  });

  it("reads the real 1.18 line shape (text nested under part)", () => {
    expect(
      parseAgentLine("opencode", '{"type":"step_start","part":{"type":"step-start"}}'),
    ).toEqual([]);
    const text = JSON.stringify({
      type: "text",
      timestamp: 1789700039063,
      part: { type: "text", text: "hola" },
    });
    expect(parseAgentLine("opencode", text)).toEqual([{ kind: "fullText", text: "hola" }]);
    expect(
      parseAgentLine("opencode", '{"type":"step_finish","part":{"reason":"stop"}}'),
    ).toEqual([{ kind: "done" }]);
  });

  it("ignores non-JSON banner lines", () => {
    expect(parseAgentLine("opencode", "info: booting")).toEqual([]);
  });
});

describe("parseAgentLine — claude", () => {
  it("streams partial text deltas", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: { type: "content_block_delta", delta: { type: "text_delta", text: "Hola" } },
    });
    expect(parseAgentLine("claude", line)).toEqual([{ kind: "delta", text: "Hola", channel: "text" }]);
  });

  it("separates thinking deltas", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: { type: "content_block_delta", delta: { type: "thinking_delta", text: "hmm" } },
    });
    expect(parseAgentLine("claude", line)).toEqual([{ kind: "delta", text: "hmm", channel: "thinking" }]);
  });

  it("ignores assistant text (already streamed via partial messages)", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Hola mundo" }] },
    });
    expect(parseAgentLine("claude", line)).toEqual([]);
  });

  it("reads tool_use from assistant content", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Read" }] },
    });
    expect(parseAgentLine("claude", line)).toEqual([{ kind: "tool", name: "Read" }]);
  });

  it("maps result success to done and errors to error", () => {
    expect(parseAgentLine("claude", '{"type":"result","subtype":"success","is_error":false}')).toEqual([
      { kind: "done" },
    ]);
    expect(parseAgentLine("claude", '{"type":"result","subtype":"error","is_error":true,"result":"boom"}')).toEqual(
      [{ kind: "error", message: "boom" }],
    );
  });
});

describe("parseAgentLine — cursor", () => {
  it("reads stream-json partial deltas (timestamp present, no model_call_id)", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: { role: "assistant", content: [{ type: "text", text: "Hola" }] },
      session_id: "abc",
      timestamp_ms: 1789700039063,
    });
    expect(parseAgentLine("cursor", line)).toEqual([{ kind: "delta", text: "Hola", channel: "text" }]);
  });

  it("skips buffered flushes (model_call_id) and final duplicate flush (no timestamp)", () => {
    const buffered = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Hola" }] },
      model_call_id: "call_1",
      timestamp_ms: 1789700039063,
    });
    const final = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Hola" }] },
    });
    expect(parseAgentLine("cursor", buffered)).toEqual([]);
    expect(parseAgentLine("cursor", final)).toEqual([]);
  });

  it("reads tool_call summaries and terminal result", () => {
    const tool = JSON.stringify({
      type: "tool_call",
      subtype: "completed",
      tool_call: { writeToolCall: { name: "write", args: { path: "nueva.md" } } },
    });
    expect(parseAgentLine("cursor", tool)).toEqual([{ kind: "tool", name: "write", brief: "nueva.md" }]);
    expect(parseAgentLine("cursor", '{"type":"result","duration_ms":123}')).toEqual([{ kind: "done" }]);
    expect(parseAgentLine("cursor", '{"type":"result","is_error":true,"result":"boom"}')).toEqual([
      { kind: "error", message: "boom" },
    ]);
  });

  it("ignores system/init lines", () => {
    expect(parseAgentLine("cursor", '{"type":"system","subtype":"init"}')).toEqual([]);
  });
});
