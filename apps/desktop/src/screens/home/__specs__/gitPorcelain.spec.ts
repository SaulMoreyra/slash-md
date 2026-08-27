import { describe, it, expect } from "vitest";
import { parsePorcelain } from "../../../../electron/git";

describe("parsePorcelain", () => {
  it("marks worktree deletions", () => {
    const map = parsePorcelain(" D docs/guide.md");
    expect(map.get("docs/guide.md")).toEqual({
      untracked: false,
      dirty: false,
      deleted: true,
    });
  });

  it("marks index deletions", () => {
    const map = parsePorcelain("D  docs/guide.md");
    expect(map.get("docs/guide.md")?.deleted).toBe(true);
  });

  it("keeps untracked files as new changes", () => {
    const map = parsePorcelain("?? docs/new.md");
    expect(map.get("docs/new.md")).toEqual({
      untracked: true,
      dirty: true,
      deleted: false,
    });
  });

  it("marks modified files without deletion", () => {
    const map = parsePorcelain(" M docs/guide.md");
    expect(map.get("docs/guide.md")).toEqual({
      untracked: false,
      dirty: true,
      deleted: false,
    });
  });
});
