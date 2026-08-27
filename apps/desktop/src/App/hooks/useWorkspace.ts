import { useCallback, useEffect, useState } from "react";
import type { HomeTreePayload, WorkspaceInfo } from "../../../shared/api";
import { AppOperation } from "../enums";
import type { RunOp } from "./useOperationsController";
import { toErrorMessage } from "../utils";

const api = () => window.slashmd;

type Params = {
  runOp: RunOp;
  onError: (message: string | null) => void;
  onClearPage: () => void;
  onSyncGit: () => Promise<void>;
};

export function useWorkspace({ runOp, onError, onClearPage, onSyncGit }: Params) {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [tree, setTree] = useState<HomeTreePayload | null>(null);

  const onRefresh = useCallback(async () => {
    const ws = await api().getWorkspace();
    setWorkspace(ws);
    if (!ws.root) {
      await onSyncGit();
      setTree(null);
      return;
    }
    const [nextTree] = await Promise.all([api().homeTree(), onSyncGit()]);
    setTree(nextTree);
  }, [onSyncGit]);

  useEffect(() => {
    void onRefresh().catch((err: unknown) => {
      onError(toErrorMessage(err));
    });
  }, [onRefresh, onError]);

  useEffect(() => {
    const subscribe = api().onFolderOpened;
    if (!subscribe) {
      return;
    }
    return subscribe(() => {
      onClearPage();
      void onRefresh().catch((err: unknown) => {
        onError(toErrorMessage(err));
      });
    });
  }, [onClearPage, onRefresh, onError]);

  const onOpenFolder = useCallback(() => {
    void runOp(AppOperation.OpenFolder, async () => {
      const folder = await api().pickFolder();
      if (!folder) {
        return;
      }
      await api().openFolder(folder);
      await onRefresh();
    });
  }, [runOp, onRefresh]);

  const onOpenPath = useCallback(
    (folderPath: string) => {
      void runOp(AppOperation.OpenFolder, async () => {
        await api().openFolder(folderPath);
        await onRefresh();
      });
    },
    [runOp, onRefresh],
  );

  const onChangeFolder = useCallback(() => {
    void runOp(AppOperation.ChangeFolder, async () => {
      const folder = await api().pickFolder();
      if (!folder) {
        return;
      }
      await api().openFolder(folder);
      onClearPage();
      await onRefresh();
    });
  }, [runOp, onClearPage, onRefresh]);

  const onCloseWorkspace = useCallback(() => {
    void runOp(AppOperation.CloseWorkspace, async () => {
      await api().closeFolder();
      onClearPage();
      setTree(null);
      await onRefresh();
    });
  }, [runOp, onClearPage, onRefresh]);

  return {
    workspace,
    tree,
    onRefresh,
    onOpenFolder,
    onOpenPath,
    onChangeFolder,
    onCloseWorkspace,
  };
}

export type WorkspaceApi = ReturnType<typeof useWorkspace>;
