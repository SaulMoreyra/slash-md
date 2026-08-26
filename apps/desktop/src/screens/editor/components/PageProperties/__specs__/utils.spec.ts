import { emptyFrontmatter } from "@slash-md/core/frontmatter";
import { describe, it, expect } from "vitest";
import { displayToken, TOKEN_COLORS, tokenColor, tokensFromPeopleInput, tokensFromTagsInput } from "../utils";

describe("PageProperties utils", () => {
  it("parses people from @, commas, and spaces", () => {
    expect(tokensFromPeopleInput("@Alice bob, Alice")).toEqual(["Alice", "bob"]);
  });

  it("drops invalid people logins", () => {
    expect(tokensFromPeopleInput("ok not_valid")).toEqual(["ok"]);
  });

  it("parses and dedupes tags", () => {
    expect(tokensFromTagsInput("api, onboarding, api")).toEqual(["api", "onboarding"]);
  });

  it("prefixes display tokens", () => {
    expect(displayToken("alice", "@")).toBe("@alice");
    expect(displayToken("api")).toBe("api");
  });

  it("picks a stable color for the same tag", () => {
    expect(tokenColor("api")).toBe(tokenColor("api"));
    expect(TOKEN_COLORS).toContain(tokenColor("api"));
  });

  it("spreads different names across the palette", () => {
    const colors = new Set(["api", "onboarding", "design", "infra"].map(tokenColor));
    expect(colors.size).toBeGreaterThan(1);
  });

  it("keeps emptyFrontmatter list fields empty", () => {
    const fields = emptyFrontmatter();
    expect(tokensFromPeopleInput(fields.people)).toEqual([]);
    expect(tokensFromTagsInput(fields.tags)).toEqual([]);
  });
});
