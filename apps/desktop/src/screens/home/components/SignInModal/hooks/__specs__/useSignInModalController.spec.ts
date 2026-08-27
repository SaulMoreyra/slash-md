import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "../../../../../../test/render";
import { GH_AUTH_LOGIN_COMMAND, GITHUB_PAT_CREATE_URL, GhCliStatus } from "../../../../enums";
import { useSignInModalController } from "../useSignInModalController";

describe("useSignInModalController", () => {
  const onSave = vi.fn();
  const probeGhAuth = vi.fn();
  const openUrl = vi.fn(async () => undefined);
  const writeText = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    probeGhAuth.mockResolvedValue({ available: true, login: "ada" });
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { probeGhAuth, openUrl },
    });
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  });

  const runHook = (busy = false) => renderHook(() => useSignInModalController({ busy, onSave }));

  it("marks GitHub CLI ready when probe returns a login", async () => {
    const { result } = runHook();
    await waitFor(() => expect(result.current.cliStatus).toBe(GhCliStatus.Ready));
    expect(result.current.cliLogin).toBe("ada");
  });

  it("connects the CLI session without a pasted token", async () => {
    const { result } = runHook();
    await waitFor(() => expect(result.current.cliStatus).toBe(GhCliStatus.Ready));
    await act(async () => {
      await result.current.onUseCli();
    });
    expect(onSave).toHaveBeenCalledWith(undefined);
  });

  it("reprobes and connects after gh auth login", async () => {
    probeGhAuth
      .mockResolvedValueOnce({ available: true, login: null })
      .mockResolvedValueOnce({ available: true, login: "ada" });
    const { result } = runHook();
    await waitFor(() => expect(result.current.cliStatus).toBe(GhCliStatus.LoggedOut));
    await act(async () => {
      await result.current.onUseCli();
    });
    expect(probeGhAuth).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenCalledWith(undefined);
    expect(result.current.cliLogin).toBe("ada");
  });

  it("saves a trimmed personal token", async () => {
    const { result } = runHook();
    await waitFor(() => expect(result.current.cliStatus).toBe(GhCliStatus.Ready));
    act(() => {
      result.current.onTokenChange("  ghp_secret  ");
    });
    act(() => {
      result.current.onConnectToken();
    });
    expect(onSave).toHaveBeenCalledWith("ghp_secret");
  });

  it("opens the classic token form with repo scope", async () => {
    const { result } = runHook();
    await waitFor(() => expect(result.current.cliStatus).toBe(GhCliStatus.Ready));
    act(() => {
      result.current.onOpenTokenPage();
    });
    expect(openUrl).toHaveBeenCalledWith(GITHUB_PAT_CREATE_URL);
  });

  it("copies the gh auth login command", async () => {
    const { result } = runHook();
    await waitFor(() => expect(result.current.cliStatus).toBe(GhCliStatus.Ready));
    await act(async () => {
      result.current.onCopyCommand();
    });
    await waitFor(() => expect(result.current.copied).toBe(true));
    expect(writeText).toHaveBeenCalledWith(GH_AUTH_LOGIN_COMMAND);
  });
});
