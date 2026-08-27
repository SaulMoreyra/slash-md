import path from "node:path";
import { describe, expect, it } from "vitest";
import { ghSearchDirs, withGhSearchPath } from "../ghPath";

describe("ghSearchDirs", () => {
  it("prefixes Homebrew and user bin dirs", () => {
    expect(ghSearchDirs("/Users/ada")).toEqual([
      "/opt/homebrew/bin",
      "/usr/local/bin",
      path.join("/Users/ada", "bin"),
      path.join("/Users/ada", ".local", "bin"),
    ]);
  });
});

describe("withGhSearchPath", () => {
  it("puts search dirs in front without duplicating", () => {
    const next = withGhSearchPath("/usr/bin:/opt/homebrew/bin", "/Users/ada", ":");
    expect(next.startsWith("/usr/local/bin:")).toBe(true);
    expect(next).toContain("/opt/homebrew/bin");
    expect(next.split(":").filter((dir) => dir === "/opt/homebrew/bin")).toHaveLength(1);
  });
});
