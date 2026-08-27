import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "@heroui/react";
import { t } from "i18next";
import { AppOperation } from "../../enums";
import { act, renderHook, waitFor } from "../../../test/render";
import { useOperationsController } from "../useOperationsController";
import { useRun } from "../useRun";

vi.mock("@heroui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@heroui/react")>();
  return {
    ...actual,
    toast: {
      ...actual.toast,
      info: vi.fn(),
      danger: vi.fn(),
    },
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useOperationsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runHook = (onRefresh = vi.fn(async () => undefined)) =>
    renderHook(() => {
      const chrome = useRun();
      return useOperationsController({
        run: chrome.run,
        onRefresh,
        error: chrome.error,
      });
    });

  it("runs a queued user action after the in-flight operation", async () => {
    const { result } = runHook();
    const first = deferred<string>();
    const second = vi.fn(async () => "second");

    let firstSettled: Promise<string | undefined> | undefined;
    let secondSettled: Promise<string | undefined> | undefined;
    act(() => {
      firstSettled = result.current.runOp(AppOperation.ReviewBatch, () => first.promise);
      secondSettled = result.current.runOp(AppOperation.PublishBatch, second);
    });

    expect(second).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(
      t("operations.queued", { operation: t("operations.names.publishBatch") }),
    );
    expect(result.current.busy).toBe(true);
    expect(result.current.pending).toBe(1);

    await act(async () => {
      first.resolve("first");
      await firstSettled;
      await secondSettled;
    });

    expect(second).toHaveBeenCalledTimes(1);
    expect(await firstSettled).toBe("first");
    expect(await secondSettled).toBe("second");
  });

  it("reuses the in-flight promise for a duplicate operation", async () => {
    const { result } = runHook();
    const first = deferred<string>();
    const duplicate = vi.fn(async () => "dup");

    let firstSettled: Promise<string | undefined> | undefined;
    let secondSettled: Promise<string | undefined> | undefined;
    act(() => {
      firstSettled = result.current.runOp(AppOperation.PublishBatch, () => first.promise);
      secondSettled = result.current.runOp(AppOperation.PublishBatch, duplicate);
    });

    expect(duplicate).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(
      t("operations.alreadyRunning", { operation: t("operations.names.publishBatch") }),
    );

    await act(async () => {
      first.resolve("first");
      await firstSettled;
      await secondSettled;
    });

    expect(await firstSettled).toBe("first");
    expect(await secondSettled).toBe("first");
    expect(duplicate).not.toHaveBeenCalled();
  });

  it("discards a background refresh while another operation is running", async () => {
    const { result } = runHook();
    const first = deferred<string>();
    const refreshFn = vi.fn(async () => "refresh");

    let firstSettled: Promise<string | undefined> | undefined;
    let refreshSettled: Promise<string | undefined> | undefined;
    act(() => {
      firstSettled = result.current.runOp(AppOperation.SyncWithWiki, () => first.promise);
      refreshSettled = result.current.runOp(AppOperation.Refresh, refreshFn);
    });

    expect(refreshFn).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();

    await act(async () => {
      first.resolve("ok");
      await firstSettled;
      await refreshSettled;
    });

    expect(await refreshSettled).toBeUndefined();
    expect(refreshFn).not.toHaveBeenCalled();
  });

  it("runs the next queued action when the current one fails", async () => {
    const { result } = runHook();
    const second = vi.fn(async () => "second");

    let firstSettled: Promise<string | undefined> | undefined;
    let secondSettled: Promise<string | undefined> | undefined;
    await act(async () => {
      firstSettled = result.current.runOp(AppOperation.PublishBatch, async () => {
        throw new Error("boom");
      });
      secondSettled = result.current.runOp(AppOperation.ReviewBatch, second);
      await firstSettled;
      await secondSettled;
    });

    expect(toast.danger).toHaveBeenCalledWith("boom");
    expect(second).toHaveBeenCalledTimes(1);
    expect(await secondSettled).toBe("second");
  });

  it("clears pending and busy after the queue drains", async () => {
    const { result } = runHook();
    const first = deferred<string>();
    const second = vi.fn(async () => "second");

    act(() => {
      void result.current.runOp(AppOperation.ReviewBatch, () => first.promise);
      void result.current.runOp(AppOperation.PublishBatch, second);
    });
    expect(result.current.busy).toBe(true);
    expect(result.current.pending).toBe(1);

    await act(async () => {
      first.resolve("first");
    });
    await waitFor(() => {
      expect(result.current.pending).toBe(0);
      expect(result.current.busy).toBe(false);
      expect(result.current.operation).toBeNull();
    });
  });

  it("keeps busy true until the queue is empty", async () => {
    const { result } = runHook();
    const first = deferred<string>();
    const second = deferred<string>();

    act(() => {
      void result.current.runOp(AppOperation.ReviewBatch, () => first.promise);
      void result.current.runOp(AppOperation.PublishBatch, () => second.promise);
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      first.resolve("first");
    });
    await waitFor(() => {
      expect(result.current.operation).toBe(AppOperation.PublishBatch);
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      second.resolve("second");
    });
    await waitFor(() => {
      expect(result.current.busy).toBe(false);
    });
  });

  it("stores an explicit git snapshot", () => {
    const { result } = runHook();
    expect(result.current.git.branch).toBeNull();
    act(() => {
      result.current.onGit({ branch: "pub/onboarding" });
    });
    expect(result.current.git.branch).toBe("pub/onboarding");
  });

  it("syncs HEAD from gitStatus", async () => {
    window.slashmd = {
      gitStatus: vi.fn(async () => ({ branch: "main" })),
    } as unknown as typeof window.slashmd;

    const { result } = runHook();
    await act(async () => {
      await result.current.onSyncGit();
    });
    expect(result.current.git.branch).toBe("main");
  });
});
