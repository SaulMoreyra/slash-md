import { useTranslation } from "react-i18next";
import type { HomeScreenProps } from "../types";
import { useConflicts } from "./useConflicts";
import { useHomeActions } from "./useHomeActions";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useModals } from "./useModals";
import { useNav } from "./useNav";
import { useSearch } from "./useSearch";
import { useTreeMutations } from "./useTreeMutations";

export function useHomeController({
  workspace,
  tree,
  pagePath,
  busy,
  error,
  children,
  onRefresh,
  onError,
  onOpenPage,
  onClosePage,
  onChangeFolder,
  onCloseWorkspace,
  run,
}: HomeScreenProps) {
  const { t } = useTranslation();
  const modals = useModals();
  const nav = useNav({
    workspace,
    tree,
    pagePath,
    libraryLabel: t("home.nav.workspace"),
    onOpenPage,
    onClosePage,
  });
  const search = useSearch({ roots: nav.roots });
  const canWrite = nav.payload?.canWrite ?? true;
  const publicationPr =
    nav.payload?.loteReview?.prNumber ?? nav.payload?.publication?.prNumber;

  const actions = useHomeActions({
    isWorkspace: nav.isWorkspace,
    canWrite,
    section: nav.section,
    publicationPr,
    modals,
    run,
    onRefresh,
    onError,
    onOpenPage,
  });

  const treeActions = useTreeMutations({
    canWrite,
    pagePath,
    modals,
    nav,
    run,
    onRefresh,
    onOpenPage,
    onClosePage,
  });
  const conflicts = useConflicts({
    tree,
    nav,
    run,
    onRefresh,
    onOpenPage,
    onClosePage,
  });

  useKeyboardShortcuts({
    pagePath,
    needsInit: nav.payload?.needsInit,
    canWrite,
    search,
    modals,
    nav,
    onClosePage,
    onRefresh,
  });

  return {
    workspace,
    pagePath,
    busy,
    error,
    children,
    onRefresh,
    onError,
    onOpenPage,
    onClosePage,
    onChangeFolder,
    onCloseWorkspace,
    run,
    search,
    modals,
    nav,
    actions,
    treeActions,
    conflicts,
    library: {
      payload: nav.payload,
      personal: nav.personal,
      roots: nav.roots,
      trails: nav.trails,
      title: nav.title,
      canWrite,
    },
  };
}

export type HomeControllerApi = ReturnType<typeof useHomeController>;
