import { describe, it, expect } from "vitest";
import type { GithubPull } from "@slash-md/github/api";
import {
  classifyPublicationPulls,
  isAheadCount,
  kindFromPulls,
  kindWithLocalAhead,
  pickPullForPublication,
} from "@slash-md/github/publicationPull";

function pull(overrides: Partial<GithubPull> = {}): GithubPull {
  return {
    number: 12,
    html_url: "https://example.com/pull/12",
    title: "Onboarding",
    state: "open",
    merged_at: null,
    head: { sha: "abc", ref: "pub/onboarding" },
    ...overrides,
  };
}

describe("kindFromPulls", () => {
  it("prefers an open pull over a merged one", () => {
    expect(
      kindFromPulls([
        pull({ number: 8, state: "closed", merged_at: "2026-08-01T00:00:00Z", merged: true }),
        pull({ number: 12, state: "open" }),
      ]),
    ).toBe("in_review");
  });

  it("is published when a pull is merged and none are open", () => {
    expect(kindFromPulls([pull({ state: "closed", merged_at: "2026-08-01T00:00:00Z" })])).toBe("published");
    expect(kindFromPulls([pull({ state: "closed", merged: true })])).toBe("published");
  });

  it("is a draft when pulls are closed without a merge", () => {
    expect(kindFromPulls([])).toBe("draft");
    expect(kindFromPulls([pull({ state: "closed", merged_at: null })])).toBe("draft");
  });
});

describe("pickPullForPublication", () => {
  it("returns the open pull when both exist", () => {
    const open = pull({ number: 12, state: "open" });
    const merged = pull({ number: 8, state: "closed", merged_at: "2026-08-01T00:00:00Z" });
    expect(pickPullForPublication([merged, open])).toEqual(open);
  });

  it("returns the most recently merged pull", () => {
    const older = pull({ number: 8, state: "closed", merged_at: "2026-07-01T00:00:00Z" });
    const newer = pull({ number: 11, state: "closed", merged_at: "2026-08-01T00:00:00Z" });
    expect(pickPullForPublication([older, newer])).toEqual(newer);
  });
});

describe("classifyPublicationPulls", () => {
  it("pairs kind with the picked pull", () => {
    const merged = pull({ number: 9, state: "closed", merged_at: "2026-08-01T00:00:00Z" });
    expect(classifyPublicationPulls([merged])).toEqual({ kind: "published", pull: merged });
  });
});

describe("kindWithLocalAhead", () => {
  it("turns a published branch with extra local commits back into a draft", () => {
    expect(kindWithLocalAhead("published", true)).toBe("draft");
    expect(kindWithLocalAhead("published", false)).toBe("published");
    expect(kindWithLocalAhead("in_review", true)).toBe("in_review");
  });
});

describe("isAheadCount", () => {
  it("is ahead only when git reports commits after the merged sha", () => {
    expect(isAheadCount(0)).toBe(false);
    expect(isAheadCount(2)).toBe(true);
  });
});
