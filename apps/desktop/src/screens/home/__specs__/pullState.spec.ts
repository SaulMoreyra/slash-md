import { describe, it, expect, vi, beforeEach } from "vitest";
import { GithubApiError, type GithubPull } from "@slash-md/github/api";
import { closePull, openPull } from "@slash-md/github/pullState";

vi.mock("@slash-md/github/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@slash-md/github/api")>();
  return {
    ...actual,
    getPull: vi.fn(),
    githubRequest: vi.fn(),
  };
});

const { getPull, githubRequest } = await import("@slash-md/github/api");

const token = "tok";
const repo = { owner: "acme", name: "docs" };

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

describe("closePull", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes an open pull", async () => {
    vi.mocked(getPull).mockResolvedValue(pull());
    vi.mocked(githubRequest).mockResolvedValue(pull({ state: "closed" }));
    const result = await closePull(token, repo, 12);
    expect(githubRequest).toHaveBeenCalledWith(token, "PATCH", "/repos/acme/docs/pulls/12", { state: "closed" });
    expect(result.state).toBe("closed");
  });

  it("returns the pull when it is already closed", async () => {
    const closed = pull({ state: "closed" });
    vi.mocked(getPull).mockResolvedValue(closed);
    await expect(closePull(token, repo, 12)).resolves.toEqual(closed);
    expect(githubRequest).not.toHaveBeenCalled();
  });

  it("rejects a merged pull", async () => {
    vi.mocked(getPull).mockResolvedValue(pull({ merged: true, merged_at: "2026-08-01T00:00:00Z", state: "closed" }));
    await expect(closePull(token, repo, 12)).rejects.toMatchObject({ message: "PR is not open", status: 422 });
    expect(githubRequest).not.toHaveBeenCalled();
  });

  it("propagates 403 and 404", async () => {
    vi.mocked(getPull).mockRejectedValue(new GithubApiError("Not Found", 404));
    await expect(closePull(token, repo, 12)).rejects.toMatchObject({ status: 404 });

    vi.mocked(getPull).mockResolvedValue(pull());
    vi.mocked(githubRequest).mockRejectedValue(new GithubApiError("Forbidden", 403));
    await expect(closePull(token, repo, 12)).rejects.toMatchObject({ status: 403 });
  });
});

describe("openPull", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reopens a closed pull", async () => {
    vi.mocked(getPull).mockResolvedValue(pull({ state: "closed" }));
    vi.mocked(githubRequest).mockResolvedValue(pull({ state: "open" }));
    const result = await openPull(token, repo, 12);
    expect(githubRequest).toHaveBeenCalledWith(token, "PATCH", "/repos/acme/docs/pulls/12", { state: "open" });
    expect(result.state).toBe("open");
  });

  it("returns the pull when it is already open", async () => {
    const open = pull();
    vi.mocked(getPull).mockResolvedValue(open);
    await expect(openPull(token, repo, 12)).resolves.toEqual(open);
    expect(githubRequest).not.toHaveBeenCalled();
  });

  it("propagates 422 when GitHub cannot reopen", async () => {
    vi.mocked(getPull).mockResolvedValue(pull({ state: "closed" }));
    vi.mocked(githubRequest).mockRejectedValue(new GithubApiError("Head branch was deleted", 422));
    await expect(openPull(token, repo, 12)).rejects.toMatchObject({ status: 422 });
  });

  it("does not reopen a merged pull", async () => {
    vi.mocked(getPull).mockResolvedValue(pull({ merged_at: "2026-08-01T00:00:00Z", state: "closed" }));
    await expect(openPull(token, repo, 12)).rejects.toMatchObject({ message: "PR is not open", status: 422 });
    expect(githubRequest).not.toHaveBeenCalled();
  });
});
