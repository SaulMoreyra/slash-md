import { describe, it, expect } from "vitest";
import { pullIsApproved, type GithubPull, type GithubReview } from "@slash-md/github/api";

function pull(author = "ada"): Pick<GithubPull, "user"> {
  return { user: { login: author } };
}

function review(login: string, state: string, body?: string): GithubReview {
  return { state, body, user: { login } };
}

describe("pullIsApproved", () => {
  it("is true when a reviewer approved and nobody requested changes", () => {
    expect(pullIsApproved(pull(), [review("ada", "COMMENTED"), review("bob", "APPROVED")])).toBe(true);
  });

  it("is false when the latest review requests changes", () => {
    expect(
      pullIsApproved(pull(), [review("bob", "APPROVED"), review("bob", "CHANGES_REQUESTED")]),
    ).toBe(false);
  });

  it("ignores the author's own approval", () => {
    expect(pullIsApproved(pull(), [review("ada", "APPROVED")])).toBe(false);
  });
});
