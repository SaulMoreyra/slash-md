import { describe, expect, it } from "vitest";
import { ChatRole, TurnStatus } from "../enums";
import { applyHostEvent, isSettled, newAgentTurn, newTurn, replaceTurn } from "../utils";

describe("chat utils", () => {
  it("creates agent turns in streaming state", () => {
    const turn = newAgentTurn();
    expect(turn.role).toBe(ChatRole.Agent);
    expect(turn.status).toBe(TurnStatus.Streaming);
    expect(turn.text).toBe("");
  });

  it("accumulates deltas and thinking", () => {
    let turn = newAgentTurn();
    turn = applyHostEvent(turn, { type: "delta", text: "ho" });
    turn = applyHostEvent(turn, { type: "delta", text: "la" });
    turn = applyHostEvent(turn, { type: "thinking", text: "…" });
    expect(turn.text).toBe("hola");
    expect(turn.thinking).toBe("…");
    expect(turn.status).toBe(TurnStatus.Streaming);
  });

  it("appends tool notes and settles on done or error", () => {
    let turn = newAgentTurn();
    turn = applyHostEvent(turn, { type: "tool", name: "read", brief: "docs/a.md" });
    expect(turn.tools).toEqual([{ name: "read", brief: "docs/a.md" }]);

    const done = applyHostEvent(turn, { type: "done", code: 0 });
    expect(done.status).toBe(TurnStatus.Done);
    expect(isSettled({ type: "done", code: 0 })).toBe(true);

    const failed = applyHostEvent(turn, { type: "error", message: "boom" });
    expect(failed.status).toBe(TurnStatus.Error);
    expect(failed.error).toBe("boom");
    expect(isSettled({ type: "error", message: "boom" })).toBe(true);
  });

  it("replaces a turn by id and ignores unknown ids", () => {
    const turn = newTurn(ChatRole.User, "hi");
    const updated = replaceTurn([turn], turn.id, (current) => ({ ...current, text: "bye" }));
    expect(updated[0].text).toBe("bye");

    const same = replaceTurn([turn], "missing", (current) => current);
    expect(same).toEqual([turn]);
  });
});
