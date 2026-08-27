import { describe, it, expect } from "vitest";
import { discardCleanPaths } from "@slash-md/core/discardCleanPaths";

describe("discardCleanPaths", () => {
  it("limits a nested contentPath to that folder", () => {
    expect(
      discardCleanPaths("docs", ["docs/guide.md", "notes.txt", "docs/images/a.png", ".env"]),
    ).toEqual(["docs/guide.md", "docs/images/a.png"]);
  });

  it("does not allow a root clean of the whole repo", () => {
    expect(discardCleanPaths(".", ["docs/a.md", "notes.txt", ".env", "images/x.png", "src/app.ts"])).toEqual([
      "docs/a.md",
      "images/x.png",
    ]);
    expect(discardCleanPaths(".", ["."])).toEqual([]);
  });

  it("treats an empty contentPath like repo root", () => {
    expect(discardCleanPaths("", ["readme.md", "node_modules/pkg/index.js"])).toEqual(["readme.md"]);
  });
});
