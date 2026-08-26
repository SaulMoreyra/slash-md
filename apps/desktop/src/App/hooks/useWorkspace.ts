import { useCallback, useEffect, useState } from "react";
import type { HomeTreePayload, WorkspaceInfo } from "../../../shared/api";
import type { Run } from "../../screens/home/types";
import { applyTheme, getStoredTheme, resolveTheme } from "../../theme/theme";
import { toErrorMessage } from "../utils";

const api = () => window.slashmd;

type Params = {
  run: Run;
  onError: (message: string | null) => void;
  onClearPage: () => void;
};

export function useWorkspace({ run, onError, onClearPage }: Params) {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [tree, setTree] = useState<HomeTreePayload | null>(null);

  const onRefresh = useCallback(async () => {
    const ws = await api().getWorkspace();
    setWorkspace(ws);
    applyTheme(resolveTheme(ws.theme));
    if (ws.root) {
      setTree(await api().homeTree());
    } else {
      setTree(null);
    }
  }, []);

  useEffect(() => {
    void onRefresh().catch((err: unknown) => {
      onError(toErrorMessage(err));
    });
  }, [onRefresh, onError]);

  useEffect(
    () =>
      api().onTheme((osTheme) => {
        if (getStoredTheme()) {
          return;
        }
        applyTheme(osTheme);
      }),
    [],
  );

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
    void run(async () => {
      const folder = await api().pickFolder();
      if (!folder) {
        return;
      }
      await api().openFolder(folder);
      await onRefresh();
    });
  }, [run, onRefresh]);

  const onOpenPath = useCallback(
    (folderPath: string) => {
      void run(async () => {
        await api().openFolder(folderPath);
        await onRefresh();
      });
    },
    [run, onRefresh],
  );

  const onChangeFolder = useCallback(() => {
    void run(async () => {
      const folder = await api().pickFolder();
      if (!folder) {
        return;
      }
      await api().openFolder(folder);
      onClearPage();
      await onRefresh();
    });
  }, [run, onClearPage, onRefresh]);

  const onCloseWorkspace = useCallback(() => {
    void run(async () => {
      await api().closeFolder();
      onClearPage();
      setTree(null);
      await onRefresh();
    });
  }, [run, onClearPage, onRefresh]);

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
