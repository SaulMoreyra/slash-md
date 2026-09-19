import { describe, expect, it } from "vitest";
import { extractMentions } from "@slash-md/agents/context";
import { removeMentionToken } from "../utils";

describe("mention utils", () => {
  it("derives mentioned paths from the draft", () => {
    expect(extractMentions("Revisá @docs/a.md y luego @docs/b.md")).toEqual([
      "docs/a.md",
      "docs/b.md",
    ]);
  });

  it("removes one mention token without touching the sentence", () => {
    expect(removeMentionToken("Mirá @docs/a.md por favor", "docs/a.md")).toBe("Mirá por favor");
  });

  it("removes every occurrence of the same path", () => {
    expect(removeMentionToken("@docs/a.md y @docs/a.md otra vez", "docs/a.md")).toBe(
      " y otra vez",
    );
  });

  it("leaves other mentions alone", () => {
    expect(removeMentionToken("@docs/a.md y @docs/b.md", "docs/a.md")).toBe(
      " y @docs/b.md",
    );
  });
});