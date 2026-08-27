import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "../../../../../../test/render";
import { AppOperation } from "../../../../../../App/enums";
import type { RunOp } from "../../../../types";
import { mockDraft, mockPayload } from "../../../../__fixtures__/home";
import { useDraftPaneController } from "../useDraftPaneController";

describe("useDraftPaneController", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onOpenPage = vi.fn();
  const onClosePage = vi.fn();
  const publishPersonal = vi.fn(async () => ({ url: "https://github.com/acme/docs" }));
  const runOpFn = vi.fn(async <T,>(_op: AppOperation, fn: () => Promise<T>) => fn());
  const runOp = runOpFn as unknown as RunOp;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { publishPersonal },
    });
  });

  const runHook = (overrides: Partial<Parameters<typeof useDraftPaneController>[0]> = {}) =>
    renderHook(() =>
      useDraftPaneController({
        payload: mockPayload({ drafts: [mockDraft({ badge: "eliminado" })] }),
        personal: true,
        pagePath: "docs/a.md",
        trails: new Map(),
        runOp,
        onRefresh,
        onOpenPage,
        onClosePage,
        ...overrides,
      }),
    );

  it("publishes all local drafts and closes a deleted open page", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.onPublish();
    });

    expect(runOpFn).toHaveBeenCalledWith(AppOperation.PublishPersonal, expect.any(Function));
    expect(publishPersonal).toHaveBeenCalledWith(["docs/a.md"]);
    expect(onRefresh).toHaveBeenCalled();
    expect(onClosePage).toHaveBeenCalled();
    expect(onOpenPage).not.toHaveBeenCalled();
  });

  it("reopens an edited page after publishing", async () => {
    const { result } = runHook({
      payload: mockPayload({ drafts: [mockDraft({ badge: "modificado" })] }),
    });
    await act(async () => {
      await result.current.onPublish();
    });

    expect(onOpenPage).toHaveBeenCalledWith("docs/a.md");
    expect(onClosePage).not.toHaveBeenCalled();
  });

  it("does not refresh when the publish operation is skipped", async () => {
    runOpFn.mockResolvedValueOnce(undefined);
    const { result } = runHook();
    await act(async () => {
      await result.current.onPublish();
    });

    expect(publishPersonal).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onClosePage).not.toHaveBeenCalled();
  });
});
