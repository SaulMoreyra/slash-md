import { describe, it, expect, vi, beforeEach } from "vitest";
import { GithubApiError, type GithubPull } from "@slash-md/github/api";
import { DISCARD_REOPEN_FAILED, discardGithubRemote } from "@slash-md/github/discardRemote";

vi.mock("@slash-md/github/pullState", () => ({
  closePull: vi.fn(),
  openPull: vi.fn(),
}));

vi.mock("@slash-md/github/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@slash-md/github/api")>();
  return {
    ...actual,
    deleteBranch: vi.fn(),
  };
});

const { closePull, openPull } = await import("@slash-md/github/pullState");
const { deleteBranch } = await import("@slash-md/github/api");

const token = "tok";
const repo = { owner: "acme", name: "docs" };
const branch = "pub/onboarding";

function pull(overrides: Partial<GithubPull> = {}): GithubPull {
  return {
    number: 12,
    html_url: "https://example.com/pull/12",
    title: "Onboarding",
    state: "open",
    merged_at: null,
    head: { sha: "abc", ref: branch },
    ...overrides,
  };
}

describe("discardGithubRemote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(closePull).mockResolvedValue(pull({ state: "closed" }));
    vi.mocked(openPull).mockResolvedValue(pull());
    vi.mocked(deleteBranch).mockResolvedValue(undefined);
  });

  it("closes the pull then deletes the remote branch", async () => {
    await discardGithubRemote({ token, repo, branch, pull: pull() });
    expect(closePull).toHaveBeenCalledWith(token, repo, 12);
    expect(deleteBranch).toHaveBeenCalledWith(token, repo, branch);
    expect(openPull).not.toHaveBeenCalled();
  });

  it("reopens the pull and leaves remote intact when delete fails", async () => {
    const denied = new GithubApiError("Forbidden", 403);
    vi.mocked(deleteBranch).mockRejectedValue(denied);
    await expect(discardGithubRemote({ token, repo, branch, pull: pull() })).rejects.toBe(denied);
    expect(openPull).toHaveBeenCalledWith(token, repo, 12);
  });

  it("reports when reopen after a failed delete also fails", async () => {
    vi.mocked(deleteBranch).mockRejectedValue(new GithubApiError("Forbidden", 403));
    vi.mocked(openPull).mockRejectedValue(new GithubApiError("Validation Failed", 422));
    await expect(discardGithubRemote({ token, repo, branch, pull: pull() })).rejects.toThrow(DISCARD_REOPEN_FAILED);
  });

  it("does not close a merged pull", async () => {
    await expect(
      discardGithubRemote({
        token,
        repo,
        branch,
        pull: pull({ merged_at: "2026-08-01T00:00:00Z", state: "closed" }),
      }),
    ).rejects.toMatchObject({ message: "PR is not open", status: 422 });
    expect(closePull).not.toHaveBeenCalled();
    expect(deleteBranch).not.toHaveBeenCalled();
  });

  it("deletes a remote draft branch without a pull", async () => {
    await discardGithubRemote({ token, repo, branch });
    expect(closePull).not.toHaveBeenCalled();
    expect(deleteBranch).toHaveBeenCalledWith(token, repo, branch);
  });
});
