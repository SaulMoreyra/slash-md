import { describe, it, expect } from "vitest";
import {
  alignMarkdownBlocks,
  allDiffsChosen,
  applyBlockChoice,
  reconstructMarkdown,
  splitMarkdownBlocks,
} from "@slash-md/core/conflictBlocks";

describe("conflictBlocks", () => {
  it("splits on blank lines and keeps fenced code together", () => {
    const md = [
      "# Title",
      "",
      "Para one.",
      "",
      "```ts",
      "const a = 1;",
      "",
      "const b = 2;",
      "```",
      "",
      "Para two.",
    ].join("\n");
    expect(splitMarkdownBlocks(md)).toEqual([
      "# Title",
      "Para one.",
      "```ts\nconst a = 1;\n\nconst b = 2;\n```",
      "Para two.",
    ]);
  });

  it("aligns equal and changed blocks", () => {
    const slots = alignMarkdownBlocks(
      "# Title\n\nMine only.\n\nShared.",
      "# Title\n\nWiki only.\n\nShared.",
    );
    expect(slots).toEqual([
      { type: "equal", text: "# Title" },
      { type: "change", ours: "Mine only.", theirs: "Wiki only." },
      { type: "equal", text: "Shared." },
    ]);
  });

  it("reconstructs after block choices", () => {
    const slots = alignMarkdownBlocks("A\n\nMine\n\nC", "A\n\nWiki\n\nC");
    const choices = applyBlockChoice(new Map(), 1, "theirs");
    expect(allDiffsChosen(slots, choices)).toBe(true);
    expect(reconstructMarkdown(slots, choices)).toBe("A\n\nWiki\n\nC");
  });

  it("reports incomplete when a change is undecided", () => {
    const slots = alignMarkdownBlocks("Mine", "Wiki");
    expect(allDiffsChosen(slots, {})).toBe(false);
    expect(reconstructMarkdown(slots, {})).toBe("Mine");
  });
});
