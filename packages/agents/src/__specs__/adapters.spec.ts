import { describe, expect, it } from "vitest";
import { AGENT_PRESETS, findAgentPreset, parseAgentLine } from "../adapters";

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
