import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "../../../../test/render";
import { AppOperation } from "../../../../App/enums";
import { ModalKind } from "../../enums";
import type { RunOp } from "../../types";
import { useHomeActions } from "../useHomeActions";
import type { ModalsApi } from "../useModals";

describe("useHomeActions", () => {
  const onRefresh = vi.fn(async () => undefined);
  const onError = vi.fn();
  const onOpenPage = vi.fn();
  const onClosePage = vi.fn();
  const newFolder = vi.fn();
  const leavePublication = vi.fn();
  const discardPublication = vi.fn();
  const landPublication = vi.fn();
  const runOpFn = vi.fn(async <T,>(_op: AppOperation, fn: () => Promise<T>) => fn());
  const runOp = runOpFn as unknown as RunOp;
  const modals = {
    kind: ModalKind.None,
    target: null,
    folderParent: undefined,
    onOpen: vi.fn(),
    onOpenFolderModal: vi.fn(),
    onOpenDiscard: vi.fn(),
    onClose: vi.fn(),
    discardTarget: null,
  } as unknown as ModalsApi;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "slashmd", {
      configurable: true,
      value: { newFolder, leavePublication, discardPublication, landPublication },
    });
  });

  const runHook = (section: string | undefined = "docs") =>
    renderHook(() =>
      useHomeActions({
        isWorkspace: false,
        canWrite: true,
        section,
        publicationPr: undefined,
        modals,
        runOp,
        onRefresh,
        onError,
        onOpenPage,
        onClosePage,
      }),
    );

  it("opens the folder modal in an explicit parent", () => {
    const { result } = runHook();
    act(() => {
      result.current.onRequestNewFolderIn("docs/guides");
    });
    expect(modals.onOpenFolderModal).toHaveBeenCalledWith("docs/guides");
  });

  it("creates a folder under the explicit parent", async () => {
    const { result } = runHook("docs");
    await act(async () => {
      await result.current.onCreateFolder("experiments", "docs/guides");
    });
    expect(newFolder).toHaveBeenCalledWith({ name: "experiments", parent: "docs/guides" });
    expect(modals.onClose).toHaveBeenCalled();
  });

  it("falls back to the nav section without an explicit parent", async () => {
    const { result } = runHook("docs");
    await act(async () => {
      await result.current.onCreateFolder("experiments");
    });
    expect(newFolder).toHaveBeenCalledWith({ name: "experiments", parent: "docs" });
  });

  it("closes the page after leaving a publication", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.onLeavePublication();
    });
    expect(leavePublication).toHaveBeenCalled();
    expect(onClosePage).toHaveBeenCalled();
  });

  it("keeps the page open when leave does not succeed", async () => {
    runOpFn.mockResolvedValueOnce(undefined);
    const { result } = runHook();
    await act(async () => {
      await result.current.onLeavePublication();
    });
    expect(onClosePage).not.toHaveBeenCalled();
  });

  it("opens the discard confirmation", () => {
    const target = {
      branch: "pub/onboarding",
      title: "Onboarding",
      kind: "draft",
      mounted: true,
      dirtyCount: 2,
    };
    const { result } = runHook();
    act(() => {
      result.current.onRequestDiscard(target);
    });
    expect(modals.onOpenDiscard).toHaveBeenCalledWith(target);
  });

  it("closes the page after discarding the mounted publication", async () => {
    modals.discardTarget = {
      branch: "pub/onboarding",
      title: "Onboarding",
      kind: "draft",
      mounted: true,
      dirtyCount: 1,
    };
    const { result } = runHook();
    await act(async () => {
      await result.current.onDiscardPublication();
    });
    expect(discardPublication).toHaveBeenCalledWith("pub/onboarding");
    expect(onClosePage).toHaveBeenCalled();
    expect(modals.onClose).toHaveBeenCalled();
  });

  it("does not close the page when discarding an unmounted publication", async () => {
    modals.discardTarget = {
      branch: "pub/other",
      title: "Other",
      kind: "in_review",
      mounted: false,
      dirtyCount: 0,
    };
    const { result } = runHook();
    await act(async () => {
      await result.current.onDiscardPublication();
    });
    expect(discardPublication).toHaveBeenCalledWith("pub/other");
    expect(onClosePage).not.toHaveBeenCalled();
  });

  it("closes the page after landing the mounted publication", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.onLandPublication();
    });
    expect(landPublication).toHaveBeenCalledWith(undefined);
    expect(onClosePage).toHaveBeenCalled();
  });

  it("does not close the page when landing an unmounted publication", async () => {
    const { result } = runHook();
    await act(async () => {
      await result.current.onLandPublication("pub/other");
    });
    expect(landPublication).toHaveBeenCalledWith("pub/other");
    expect(onClosePage).not.toHaveBeenCalled();
  });
});
