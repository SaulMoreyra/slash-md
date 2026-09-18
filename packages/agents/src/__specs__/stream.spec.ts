import { describe, expect, it } from "vitest";
import {
  ChatStream,
  extractEditableMarkdown,
  initialStreamState,
  reduceAgentExit,
  reduceAgentLine,
} from "../stream";
import { ChatMode, type ChatHostEvent } from "../types";

function feed(lines: string[]) {
  let state = initialStreamState();
  const events: ChatHostEvent[] = [];
  for (const line of lines) {
    const result = reduceAgentLine("opencode", ChatMode.Chat, state, line);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

describe("reduceAgentLine", () => {
  it("accumulates token deltas", () => {
    const { state, events } = feed(['{"type":"delta","text":"Hola"}', '{"type":"delta","text":" mundo"}']);
    expect(state.text).toBe("Hola mundo");
    expect(events).toEqual([
      { type: "delta", text: "Hola" },
      { type: "delta", text: " mundo" },
    ]);
  });

  it("ignores redundant complete parts after deltas", () => {
    const { state, events } = feed(['{"type":"delta","text":"Hola"}', '{"type":"text","text":"Hola mundo"}']);
    expect(state.text).toBe("Hola");
    expect(events).toEqual([{ type: "delta", text: "Hola" }]);
  });

  it("emits non-streaming full text exactly once", () => {
    const { state, events } = feed(['{"type":"text","text":"Hola"}', '{"type":"text","text":"Hola mundo"}']);
    expect(state.text).toBe("Hola mundo");
    expect(events).toEqual([{ type: "delta", text: "Hola" }, { type: "delta", text: " mundo" }]);
  });

  it("ends once on step_finish", () => {
    const { state, events } = feed(['{"type":"delta","text":"ok"}', '{"type":"step_finish"}', '{"type":"step_finish"}']);
    expect(state.ended).toBe(true);
    expect(events.filter((event) => event.type === "done")).toHaveLength(1);
  });
});

describe("extractEditableMarkdown", () => {
  it("takes the content of a fenced markdown block", () => {
    const text = "Listo:\n\n```markdown\n# Título\n\ncuerpo\n```\n\nfin";
    expect(extractEditableMarkdown(text)).toBe("# Título\n\ncuerpo\n");
  });

  it("works while the fence is still open", () => {
    expect(extractEditableMarkdown("```markdown\n# Título")).toBe("# Título");
  });

  it("returns raw markdown unchanged", () => {
    expect(extractEditableMarkdown("# Título\n\ncuerpo\n")).toBe("# Título\n\ncuerpo\n");
  });
});

describe("reduceAgentLine — edit mode", () => {
  it("emits an editStream snapshot of the new body", () => {
    const result = reduceAgentLine(
      "opencode",
      ChatMode.EditPage,
      initialStreamState(),
      '{"type":"delta","text":"```markdown\\n# T\\n```"}',
    );
    expect(result.state.edit).toBe("# T\n");
    expect(result.events).toContainEqual({ type: "editStream", markdown: "# T\n" });
  });
});

describe("reduceAgentExit", () => {
  it("emits done when the process exits cleanly", () => {
    const { events } = reduceAgentExit(ChatMode.Chat, initialStreamState(), 0);
    expect(events).toEqual([{ type: "done", code: 0 }]);
  });

  it("keeps partial text on a non-zero exit", () => {
    const state = { ...initialStreamState(), text: "parcial" };
    const { events } = reduceAgentExit(ChatMode.Chat, state, 1, "warn");
    expect(events).toEqual([{ type: "done", code: 1 }]);
  });

  it("surfaces stderr when nothing was produced", () => {
    const { events } = reduceAgentExit(ChatMode.Chat, initialStreamState(), 127, "command not found");
    expect(events).toEqual([{ type: "error", message: "command not found", code: "127" }]);
  });

  it("does not double-end an already finished stream", () => {
    const { events } = reduceAgentExit(ChatMode.Chat, { ...initialStreamState(), ended: true }, 0);
    expect(events).toEqual([]);
  });
});

describe("ChatStream", () => {
  it("throttles editStream but flushes the final snapshot on exit", () => {
    const events: ChatHostEvent[] = [];
    let now = 0;
    const stream = new ChatStream("opencode", ChatMode.EditPage, (event) => events.push(event), 100, () => now);
    stream.pushLine('{"type":"delta","text":"a"}');
    now = 10;
    stream.pushLine('{"type":"delta","text":"b"}');
    now = 250;
    stream.pushLine('{"type":"delta","text":"c"}');
    stream.exit(0);
    const edits = events.filter((event) => event.type === "editStream");
    expect(edits).toEqual([
      { type: "editStream", markdown: "a" },
      { type: "editStream", markdown: "abc" },
    ]);
  });

  it("emits a start-agnostic error through fail()", () => {
    const events: ChatHostEvent[] = [];
    const stream = new ChatStream("claude", ChatMode.Chat, (event) => events.push(event));
    stream.fail("agent not installed", "ENOENT");
    expect(events).toEqual([{ type: "error", message: "agent not installed", code: "ENOENT" }]);
  });
});
