import { RailMode, TreeEntryKind } from "../../../enums";
import type { HomeControllerApi } from "../../../hooks/useHomeController";
import { Rail } from "../../Rail";
import { RailCollapsed } from "../../Rail/components/RailCollapsed";
import { RailOverlay } from "../../Rail/components/RailOverlay";
import { useHome } from "../context";

export function RailSlot() {
  const home = useHome();
  const { nav } = home;
  const rail = <ConnectedRail home={home} />;
  const collapsed = <ConnectedRailCollapsed home={home} />;

  if (nav.railMode === RailMode.Overlay) {
    return (
      <>
        {collapsed}
        {nav.railOpen ? <RailOverlay onClose={nav.onCloseRail}>{rail}</RailOverlay> : null}
      </>
    );
  }

  if (!nav.railOpen) {
    return collapsed;
  }

  return <div className="flex h-full min-h-0 w-60 shrink-0 flex-col">{rail}</div>;
}

function ConnectedRail({ home }: { home: HomeControllerApi }) {
  const chrome = railChrome(home);

  return (
    <Rail
      {...chrome}
      branch={home.git.branch}
      roots={home.library.roots}
      treeSelected={home.nav.treeSelected}
      expanded={home.nav.expanded}
      searchKeys={home.search.keys}
      onCloseRail={home.nav.onCloseRail}
      onFile={(path) => {
        home.nav.onReveal(path, TreeEntryKind.File);
        home.onOpenPage(path);
        home.nav.onDismissOverlay();
      }}
      onFolder={home.nav.onOpenFolder}
      onToggle={home.nav.onToggleFolder}
      canToggleAllFolders={home.nav.canToggleAllFolders}
      treeExpandMode={home.nav.treeExpandMode}
      onToggleAllFolders={home.nav.onToggleAllFolders}
      onRename={home.library.canWrite ? home.treeActions.onRequestRename : undefined}
      onDelete={home.library.canWrite ? home.treeActions.onRequestDelete : undefined}
      onNewFileInFolder={home.library.canWrite ? home.nav.onNewFileInFolder : undefined}
      onNewFolderInFolder={
        home.library.canWrite ? (node) => home.actions.onRequestNewFolderIn(node.path) : undefined
      }
    />
  );
}

function ConnectedRailCollapsed({ home }: { home: HomeControllerApi }) {
  const chrome = railChrome(home);

  return (
    <RailCollapsed
      {...chrome}
      isWorkspace={!home.library.personal}
      railOpen={home.nav.railOpen}
      onToggle={home.nav.onToggleRail}
    />
  );
}

function railChrome(home: HomeControllerApi) {
  const { library, nav, search, actions, workspace, busy, onChangeFolder, onCloseWorkspace, onRefresh } = home;

  return {
    title: library.title,
    nav: nav.view,
    payload: library.payload,
    personal: library.personal,
    busy,
    workspace,
    createIntent: nav.createIntent,
    onChangeFolder,
    onCloseWorkspace,
    onConfig: () => (library.payload?.needsInit ? actions.onRequestInit() : actions.onRequestConfig()),
    onOpenSearch: search.onOpenCleared,
    onNav: nav.onNavigate,
    onInit: actions.onRequestInit,
    onNewPage: actions.onRequestNewPage,
    onSignIn: actions.onRequestSignIn,
    onSignOut: () => void actions.onSignOut(),
    onFolderModal: actions.onRequestFolder,
    onRefresh: () => void onRefresh(),
    onNewPublication: actions.onRequestPublication,
    chatOpen: home.chat.open,
    onToggleChat: home.chat.onToggle,
  };
}
