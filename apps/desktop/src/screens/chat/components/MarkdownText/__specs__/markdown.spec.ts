import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "../markdown";

describe("parseMarkdown", () => {
  it("parses headings, paragraphs and horizontal rules", () => {
    const blocks = parseMarkdown("## Title\n\nBody line\n\n---");
    expect(blocks).toEqual([
      { kind: "heading", level: 2, text: "Title" },
      { kind: "paragraph", text: "Body line" },
      { kind: "hr" },
    ]);
  });

  it("captures fenced code with its language", () => {
    const blocks = parseMarkdown("text\n\n```ts\nconst a = 1;\n```");
    expect(blocks[1]).toEqual({ kind: "code", lang: "ts", code: "const a = 1;" });
  });

  it("groups ordered and unordered lists", () => {
    expect(parseMarkdown("- one\n- two")).toEqual([
      { kind: "list", ordered: false, items: ["one", "two"] },
    ]);
    expect(parseMarkdown("1. a\n2. b")).toEqual([
      { kind: "list", ordered: true, items: ["a", "b"] },
    ]);
  });

  it("collects blockquotes", () => {
    expect(parseMarkdown("> first\n> second")).toEqual([
      { kind: "quote", text: "first\nsecond" },
    ]);
  });

  it("keeps multi-line paragraphs together", () => {
    expect(parseMarkdown("one\ntwo")).toEqual([{ kind: "paragraph", text: "one\ntwo" }]);
  });
});

describe("parseInline", () => {
  it("classifies bold, italic, code and links", () => {
    expect(parseInline("a **b** *c* `d` [e](https://x.dev)")).toEqual([
      { kind: "text", value: "a " },
      { kind: "bold", value: "b" },
      { kind: "text", value: " " },
      { kind: "italic", value: "c" },
      { kind: "text", value: " " },
      { kind: "code", value: "d" },
      { kind: "text", value: " " },
      { kind: "link", value: "e", href: "https://x.dev" },
    ]);
  });

  it("returns plain text when there is no markup", () => {
    expect(parseInline("hello")).toEqual([{ kind: "text", value: "hello" }]);
  });
});
