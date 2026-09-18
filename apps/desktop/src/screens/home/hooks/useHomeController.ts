import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMenuActions } from "../../../App/hooks/useMenuActions";
import { AppOperation } from "../../../App/enums";
import { MenuAction } from "../../../../shared/menu";
import type { PageChatHost, PageChatHostRegistry } from "../../chat";
import type { HomeScreenProps } from "../types";
import { ModalKind, NavKind } from "../enums";
import { requestOpenFindInPage } from "../../editor/findInPageBridge";
import { newPageModalKind, settingsModalKind } from "../utils";
import { useConflicts } from "./useConflicts";
import { useChatBubble } from "./useChatBubble";
import { useHomeActions } from "./useHomeActions";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useModals } from "./useModals";
import { useNav } from "./useNav";
import { useSearch } from "./useSearch";
import { useTreeMutations } from "./useTreeMutations";

export function useHomeController({
  workspace,
  tree,
  git,
  pagePath,
  busy,
  error,
  children,
  onRefresh,
  onError,
  onOpenPage,
  onClosePage,
  tabs,
  activeKey,
  onActivateTab,
  onCloseTab,
  onRewritePath,
  onCloseTabsUnder,
  onChangeFolder,
  onCloseWorkspace,
  runOp,
}: HomeScreenProps) {
  const { t } = useTranslation();
  const modals = useModals();
  const chat = useChatBubble();
  const pageHostsRef = useRef(new Map<string, PageChatHost>());
  const registerPageHost = useCallback<PageChatHostRegistry["register"]>((path, host) => {
    pageHostsRef.current.set(path, host);
  }, []);
  const unregisterPageHost = useCallback<PageChatHostRegistry["unregister"]>((path) => {
    pageHostsRef.current.delete(path);
  }, []);
  const getPageHost = useCallback<PageChatHostRegistry["get"]>(
    (path) => pageHostsRef.current.get(path) ?? null,
    [],
  );
  const pageHosts: PageChatHostRegistry = {
    register: registerPageHost,
    unregister: unregisterPageHost,
    get: getPageHost,
  };
  const nav = useNav({
    workspace,
    tree,
    pagePath,
    libraryLabel: t("home.nav.workspace"),
  });
  const search = useSearch({
    contentPath: tree?.contentPath ?? ".",
    enabled: Boolean(tree) && !tree?.needsInit,
  });
  const canWrite = nav.payload?.canWrite ?? true;
  const publicationPr =
    nav.payload?.loteReview?.prNumber ?? nav.payload?.publication?.prNumber;

  const actions = useHomeActions({
    isWorkspace: nav.isWorkspace,
    canWrite,
    section: nav.section,
    publicationPr,
    modals,
    runOp,
    onRefresh,
    onError,
    onOpenPage,
    onClosePage,
  });

  const treeActions = useTreeMutations({
    canWrite,
    modals,
    nav,
    runOp,
    onRefresh,
    onRewritePath,
    onCloseTabsUnder,
  });
  const conflicts = useConflicts({
    tree,
    nav,
    runOp,
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
    chat,
    nav,
    tabs,
    activeKey,
    onActivateTab,
    onClosePage,
    onRefresh,
    runOp,
  });

  useMenuActions({
    [MenuAction.NewPage]: () => {
      modals.onOpen(newPageModalKind(Boolean(nav.payload?.needsInit), nav.isWorkspace, canWrite));
    },
    [MenuAction.NewFolder]: () => {
      modals.onOpen(ModalKind.Folder);
    },
    [MenuAction.Search]: () => {
      search.onToggle();
    },
    [MenuAction.FindInPage]: () => {
      if (pagePath) {
        requestOpenFindInPage();
      }
    },
    [MenuAction.Settings]: () => {
      modals.onOpen(settingsModalKind(Boolean(nav.payload?.needsInit)));
    },
    [MenuAction.ToggleWorkPane]: () => {
      if (nav.view.kind !== NavKind.Folder) {
        nav.onToggleWorkPane();
      }
    },
    [MenuAction.ToggleRail]: () => {
      nav.onToggleRail();
    },
    [MenuAction.ToggleChat]: () => {
      chat.onToggle();
    },
    [MenuAction.ClosePage]: () => {
      if (pagePath) {
        onClosePage();
      }
    },
    [MenuAction.Refresh]: () => {
      void runOp(AppOperation.Refresh, onRefresh);
    },
  });

  return {
    workspace,
    git,
    pagePath,
    busy,
    error,
    children,
    onRefresh,
    onError,
    onOpenPage,
    onClosePage,
    tabs: {
      items: tabs,
      activeKey,
      onActivateTab,
      onCloseTab,
    },
    onChangeFolder,
    onCloseWorkspace,
    runOp,
    search,
    modals,
    nav,
    chat,
    pageHosts,
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
