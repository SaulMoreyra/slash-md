import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DesktopApi, HomeTreePayload, WorkspaceInfo } from "../../../../shared/api";
import { mockPayload } from "../../../screens/home/__fixtures__/home";
import { act, renderHook, waitFor } from "../../../test/render";
import { AppOperation } from "../../enums";
import type { RunOp } from "../useOperationsController";
import { useWorkspace } from "../useWorkspace";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function mockWorkspace(root: string | null): WorkspaceInfo {
  return {
    root,
    config: null,
    slashmd: {},
    needsInit: !root,
    mcpUrl: null,
    auth: null,
    theme: "dark",
  };
}

describe("useWorkspace", () => {
  const onError = vi.fn();
  const onClearPage = vi.fn();
  const onSyncGit = vi.fn(async () => undefined);
  const runOp = vi.fn(async <T,>(_op: AppOperation, fn: () => Promise<T>) => fn()) as unknown as RunOp;

  function stubApi(overrides: Partial<DesktopApi> = {}) {
    window.slashmd = {
      getWorkspace: vi.fn(async () => mockWorkspace("/tmp/wiki")),
      homeTree: vi.fn(async () => mockPayload()),
      onFolderOpened: undefined,
      pickFolder: vi.fn(async () => undefined),
      openFolder: vi.fn(async () => mockWorkspace("/tmp/wiki")),
      closeFolder: vi.fn(async () => mockWorkspace(null)),
      ...overrides,
    } as unknown as DesktopApi;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    stubApi();
  });

  const runHook = () =>
    renderHook(() =>
      useWorkspace({
        runOp,
        onError,
        onClearPage,
        onSyncGit,
      }),
    );

  it("syncs git before the home tree lands", async () => {
    const tree = deferred<HomeTreePayload>();
    stubApi({
      homeTree: vi.fn(() => tree.promise),
    });

    const { result } = runHook();

    await waitFor(() => {
      expect(onSyncGit).toHaveBeenCalled();
    });
    expect(result.current.tree).toBeNull();

    await act(async () => {
      tree.resolve(mockPayload());
    });
    await waitFor(() => {
      expect(result.current.tree).not.toBeNull();
    });
  });

  it("clears the tree and syncs git when no folder is open", async () => {
    stubApi({
      getWorkspace: vi.fn(async () => mockWorkspace(null)),
    });

    const { result } = runHook();
    await waitFor(() => {
      expect(onSyncGit).toHaveBeenCalled();
      expect(result.current.workspace?.root).toBeNull();
    });
    expect(result.current.tree).toBeNull();
  });
});
