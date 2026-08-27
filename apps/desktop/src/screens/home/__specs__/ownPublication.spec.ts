import { describe, it, expect } from "vitest";
import { isOwnPublication, sameGithubLogin } from "@slash-md/github/ownPublication";

describe("sameGithubLogin", () => {
  it("ignores case", () => {
    expect(sameGithubLogin("Octocat", "octocat")).toBe(true);
    expect(sameGithubLogin("ada", "bob")).toBe(false);
  });
});

describe("isOwnPublication", () => {
  it("includes a remote-only PR authored by the current user", () => {
    expect(
      isOwnPublication({
        login: "ada",
        local: false,
        pull: { author: "ada" },
      }),
    ).toBe(true);
  });

  it("excludes someone else's open PR even with a local clone", () => {
    expect(
      isOwnPublication({
        login: "ada",
        local: true,
        pull: { author: "bob" },
      }),
    ).toBe(false);
  });

  it("includes a local draft without an open PR", () => {
    expect(
      isOwnPublication({
        login: "ada",
        local: true,
        pull: null,
      }),
    ).toBe(true);
    expect(
      isOwnPublication({
        login: null,
        local: true,
        pull: null,
      }),
    ).toBe(true);
  });

  it("excludes a remote-only branch with no open PR", () => {
    expect(
      isOwnPublication({
        login: "ada",
        local: false,
        pull: null,
      }),
    ).toBe(false);
  });

  it("keeps local drafts when GitHub lookup fails", () => {
    expect(
      isOwnPublication({
        login: "ada",
        local: true,
        pull: undefined,
      }),
    ).toBe(true);
  });

  it("hides remote-only branches when GitHub lookup fails", () => {
    expect(
      isOwnPublication({
        login: "ada",
        local: false,
        pull: undefined,
      }),
    ).toBe(false);
  });

  it("matches PR authors case-insensitively", () => {
    expect(
      isOwnPublication({
        login: "Octocat",
        local: false,
        pull: { author: "octocat" },
      }),
    ).toBe(true);
  });

  it("excludes a PR with no author (bot) or no session login", () => {
    expect(
      isOwnPublication({
        login: "ada",
        local: true,
        pull: { author: null },
      }),
    ).toBe(false);
    expect(
      isOwnPublication({
        login: null,
        local: true,
        pull: { author: "ada" },
      }),
    ).toBe(false);
  });
});
