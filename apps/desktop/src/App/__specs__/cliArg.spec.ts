import { describe, it, expect } from "vitest";
import { parseFolderArg } from "../../../shared/cliArg";

describe("parseFolderArg", () => {
  it("reads the folder after --", () => {
    expect(parseFolderArg(["electron", ".", "--", "/Users/me/docs"])).toBe("/Users/me/docs");
  });

  it("ignores flags after --", () => {
    expect(parseFolderArg(["electron", "--", "--inspect", "/tmp/wiki"])).toBe("/tmp/wiki");
  });

  it("returns undefined without --", () => {
    expect(parseFolderArg(["electron", ".", "/tmp/wiki"])).toBeUndefined();
  });
});
