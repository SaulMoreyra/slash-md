import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "../../../test/render";
import { useRun } from "../useRun";

describe("useRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runHook = () => renderHook(() => useRun());

  it("sets busy while the callback runs", async () => {
    const { result } = runHook();
    let resolveFn: (value: string) => void = () => undefined;
    const pending = new Promise<string>((resolve) => {
      resolveFn = resolve;
    });

    let settled: Promise<string | undefined> | undefined;
    act(() => {
      settled = result.current.run(() => pending);
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      resolveFn("ok");
      await settled;
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("captures errors from the callback", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.run(async () => {
        throw new Error("boom");
      });
    });
    expect(result.current.error).toBe("boom");
    expect(result.current.busy).toBe(false);
  });

  it("strips Electron IPC wrapping from errors", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.run(async () => {
        throw new Error("Error invoking remote method 'publishBatch': Error: needs approval");
      });
    });
    expect(result.current.error).toBe("needs approval");
  });

  it("ignores overlapping run calls while busy", async () => {
    const { result } = runHook();
    let resolveFirst: (value: string) => void = () => undefined;
    const first = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const second = vi.fn(async () => "second");

    let firstSettled: Promise<string | undefined> | undefined;
    let secondSettled: Promise<string | undefined> | undefined;
    act(() => {
      firstSettled = result.current.run(() => first);
      secondSettled = result.current.run(second);
    });
    expect(result.current.busy).toBe(true);
    expect(second).not.toHaveBeenCalled();

    await act(async () => {
      resolveFirst("first");
      await firstSettled;
      await secondSettled;
    });
    expect(await firstSettled).toBe("first");
    expect(await secondSettled).toBeUndefined();
    expect(result.current.busy).toBe(false);
  });
});
