import { describe, it, expect } from "vitest";
import { commenterFromGithubUser, parseGitShortstat, uniqueCommenters } from "@slash-md/core/publicationMeta";

describe("parseGitShortstat", () => {
  it("parses files, insertions, and deletions", () => {
    expect(parseGitShortstat(" 3 files changed, 12 insertions(+), 4 deletions(-)\n")).toEqual({
      changedFiles: 3,
      additions: 12,
      deletions: 4,
    });
  });

  it("treats a missing insertions or deletions clause as zero", () => {
    expect(parseGitShortstat(" 1 file changed, 8 insertions(+)")).toEqual({
      changedFiles: 1,
      additions: 8,
      deletions: 0,
    });
    expect(parseGitShortstat(" 2 files changed, 3 deletions(-)")).toEqual({
      changedFiles: 2,
      additions: 0,
      deletions: 3,
    });
  });

  it("returns a zero diff for empty stdout", () => {
    expect(parseGitShortstat("")).toEqual({ changedFiles: 0, additions: 0, deletions: 0 });
  });
});

describe("uniqueCommenters", () => {
  it("keeps first login casing and fills in a later avatar", () => {
    expect(
      uniqueCommenters([
        { login: "Ada" },
        { login: "ada", avatarUrl: "https://example.com/ada.png" },
        { login: "bob" },
        null,
      ]),
    ).toEqual([
      { login: "Ada", avatarUrl: "https://example.com/ada.png" },
      { login: "bob" },
    ]);
  });
});

describe("commenterFromGithubUser", () => {
  it("skips empty logins and keeps avatar urls", () => {
    expect(commenterFromGithubUser(null)).toBeNull();
    expect(commenterFromGithubUser({ login: " ada ", avatar_url: "https://example.com/ada.png" })).toEqual({
      login: "ada",
      avatarUrl: "https://example.com/ada.png",
    });
  });
});
