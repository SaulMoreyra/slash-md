import { describe, it, expect } from "vitest";
import { isPosixUnder, rewritePosixPrefix, rewritePosixPrefixList } from "@slash-md/core/paths";

describe("posix prefix helpers", () => {
  it("treats a path as under itself and its descendants", () => {
    expect(isPosixUnder("docs/a.md", "docs")).toBe(true);
    expect(isPosixUnder("docs", "docs")).toBe(true);
    expect(isPosixUnder("docs-extra/a.md", "docs")).toBe(false);
  });

  it("rewrites a folder prefix", () => {
    expect(rewritePosixPrefix("docs/old", "docs/old", "docs/new")).toBe("docs/new");
    expect(rewritePosixPrefix("docs/old/a.md", "docs/old", "docs/new")).toBe("docs/new/a.md");
    expect(rewritePosixPrefix("docs/other.md", "docs/old", "docs/new")).toBe("docs/other.md");
  });

  it("rewrites or drops list entries after rename or delete", () => {
    const paths = ["docs/old/a.md", "docs/keep.md", "docs/old"];
    expect(rewritePosixPrefixList(paths, "docs/old", "docs/new")).toEqual([
      "docs/new/a.md",
      "docs/keep.md",
      "docs/new",
    ]);
    expect(rewritePosixPrefixList(paths, "docs/old", null)).toEqual(["docs/keep.md"]);
  });
});
