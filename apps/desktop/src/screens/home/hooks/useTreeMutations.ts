import type { HomeTreeNode } from "../../../../shared/api";
import { AppOperation } from "../../../App/enums";
import { ModalKind, TreeEntryKind } from "../enums";
import type { HomeScreenProps } from "../types";
import type { ModalsApi } from "./useModals";
import type { NavApi } from "./useNav";

const api = () => window.slashmd;

type Args = {
  canWrite: boolean;
  modals: ModalsApi;
  nav: Pick<NavApi, "onRewritePath">;
  runOp: HomeScreenProps["runOp"];
  onRefresh: HomeScreenProps["onRefresh"];
  onRewritePath: HomeScreenProps["onRewritePath"];
  onCloseTabsUnder: HomeScreenProps["onCloseTabsUnder"];
};

export type TreeMutationsApi = ReturnType<typeof useTreeMutations>;

export function useTreeMutations({
  canWrite,
  modals,
  nav,
  runOp,
  onRefresh,
  onRewritePath,
  onCloseTabsUnder,
}: Args) {
  function targetFrom(node: HomeTreeNode) {
    return {
      kind: node.kind === TreeEntryKind.Folder ? TreeEntryKind.Folder : TreeEntryKind.File,
      path: node.path,
      title: node.title,
    };
  }

  function onRequestRename(node: HomeTreeNode) {
    if (!canWrite) {
      return;
    }
    modals.onOpen(ModalKind.Rename, targetFrom(node));
  }

  function onRequestDelete(node: HomeTreeNode) {
    if (!canWrite) {
      return;
    }
    modals.onOpen(ModalKind.Delete, targetFrom(node));
  }

  async function onRename(name: string) {
    const target = modals.target;
    if (!target) {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    if (target.kind === TreeEntryKind.File) {
      const result = await runOp(AppOperation.RenamePage, async () => {
        const renamed = await api().renamePage(target.path, trimmed);
        if (renamed) {
          await onRefresh();
        }
        return renamed;
      });
      if (!result) {
        return;
      }
      modals.onClose();
      onRewritePath(target.path, result.path);
      return;
    }

    const result = await runOp(AppOperation.RenameFolder, async () => {
      const renamed = await api().renameFolder(target.path, trimmed);
      if (renamed) {
        await onRefresh();
      }
      return renamed;
    });
    if (!result) {
      return;
    }
    modals.onClose();
    nav.onRewritePath(target.path, result.path);
    onRewritePath(target.path, result.path);
  }

  async function onDelete() {
    const target = modals.target;
    if (!target) {
      return;
    }

    if (target.kind === TreeEntryKind.File) {
      onCloseTabsUnder(target.path);
      const deleted = await runOp(AppOperation.DeletePage, async () => {
        await api().deletePage(target.path);
        await onRefresh();
        return true;
      });
      if (deleted) {
        modals.onClose();
      }
      return;
    }

    onCloseTabsUnder(target.path);
    const deleted = await runOp(AppOperation.DeleteFolder, async () => {
      await api().deleteFolder(target.path);
      await onRefresh();
      return true;
    });
    if (deleted) {
      modals.onClose();
    }
  }

  return {
    onRequestRename,
    onRequestDelete,
    onRename,
    onDelete,
  };
}
