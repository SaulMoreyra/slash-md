import { Button, ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconChat, IconPlus, IconSearch } from "../../../../components/icons";
import { ShortcutKbd, shortcutLabel } from "../../../../components/ShortcutKbd";
import type {
  HomeTreeNode,
  HomeTreePayload,
  WorkspaceInfo,
} from "../../../../../shared/api";
import { CreateIntent, TreeExpandMode } from "../../enums";
import type { NavView } from "../../types";
import { AccountMenu } from "../AccountMenu";
import { RailHeader } from "./components/RailHeader";
import { RailNav } from "./components/RailNav";
import { RailTree } from "./components/RailTree";

type Props = {
  title: string;
  nav: NavView;
  payload: HomeTreePayload | null;
  branch: string | null;
  personal: boolean;
  busy: boolean;
  workspace: WorkspaceInfo;
  roots: HomeTreeNode[];
  treeSelected: string | undefined;
  expanded: Set<string>;
  searchKeys: string;
  onChangeFolder: () => void;
  onCloseWorkspace: () => void;
  onConfig: () => void;
  onOpenSearch: () => void;
  onCloseRail: () => void;
  onNav: (nav: NavView) => void;
  onFile: (path: string) => void;
  onFolder: (node: HomeTreeNode) => void;
  onToggle: (path: string) => void;
  canToggleAllFolders?: boolean;
  treeExpandMode?: TreeExpandMode;
  onToggleAllFolders?: () => void;
  onRename?: (node: HomeTreeNode) => void;
  onDelete?: (node: HomeTreeNode) => void;
  onInit: () => void;
  onNewPage: () => void;
  createIntent?: CreateIntent;
  onSignIn: () => void;
  onSignOut: () => void;
  onFolderModal: () => void;
  onNewFileInFolder?: (node: HomeTreeNode) => void;
  onNewFolderInFolder?: (node: HomeTreeNode) => void;
  onRefresh: () => void;
  onNewPublication?: () => void;
  chatOpen?: boolean;
  onToggleChat?: () => void;
};

export function Rail({
  title,
  nav,
  payload,
  branch,
  personal,
  busy,
  workspace,
  roots,
  treeSelected,
  expanded,
  searchKeys,
  onChangeFolder,
  onCloseWorkspace,
  onConfig,
  onOpenSearch,
  onCloseRail,
  onNav,
  onFile,
  onFolder,
  onToggle,
  canToggleAllFolders,
  treeExpandMode,
  onToggleAllFolders,
  onRename,
  onDelete,
  onInit,
  onNewPage,
  createIntent = CreateIntent.Page,
  onSignIn,
  onSignOut,
  onFolderModal,
  onNewFileInFolder,
  onNewFolderInFolder,
  onRefresh,
  onNewPublication,
  chatOpen = false,
  onToggleChat,
}: Props) {
  const { t } = useTranslation();
  const needsInit = Boolean(payload?.needsInit);
  const isWorkspace = !personal;
  const canWrite = payload?.canWrite ?? true;
  const showPublicationCta = isWorkspace && !canWrite;

  function handlePrimaryCta() {
    if (needsInit) {
      onInit();
    } else if (showPublicationCta) {
      onNewPublication?.();
    } else {
      onNewPage();
    }
  }

  let ctaLabel = t("home.nav.newPage");
  if (needsInit) {
    ctaLabel = t("home.init");
  } else if (showPublicationCta) {
    ctaLabel = t("home.publication.new");
  } else if (createIntent === CreateIntent.Template) {
    ctaLabel = t("home.nav.newTemplate");
  }

  return (
    <aside
      className="flex h-full min-h-0 w-full shrink-0 flex-col gap-3"
      aria-label={t("home.rail.aria")}
    >
      <RailHeader
        title={title}
        subtitle={branch ?? undefined}
        onChangeFolder={onChangeFolder}
        onCloseWorkspace={onCloseWorkspace}
        onConfig={onConfig}
        onCloseRail={onCloseRail}
      />

      <Button
        variant="ghost"
        className="w-full justify-between border border-separator bg-default/40"
        isDisabled={needsInit}
        aria-keyshortcuts="Meta+K Control+K"
        onPress={onOpenSearch}
      >
        <span className="flex items-center gap-2 text-muted">
          <IconSearch />
          {t("home.nav.search")}
        </span>
        <ShortcutKbd keys={searchKeys} />
      </Button>

      {onToggleChat ? (
        <Button
          variant="ghost"
          className="w-full justify-between border border-separator bg-default/40"
          aria-label={t("home.chat.title")}
          aria-pressed={chatOpen}
          onPress={onToggleChat}
        >
          <span className="flex items-center gap-2 text-muted">
            <IconChat />
            {t("home.chat.title")}
          </span>
        </Button>
      ) : null}

      <ScrollShadow className="min-h-0 flex-1 [--scroll-shadow-scrollbar-size:0px]">
        <RailNav
          nav={nav}
          payload={payload}
          isWorkspace={isWorkspace}
          canToggleAllFolders={canToggleAllFolders}
          treeExpandMode={treeExpandMode}
          onNav={onNav}
          onToggleAllFolders={onToggleAllFolders}
        />
        <RailTree
          payload={payload}
          roots={roots}
          selected={treeSelected}
          expanded={expanded}
          canWrite={canWrite}
          onFile={onFile}
          onFolder={onFolder}
          onToggle={onToggle}
          onRename={onRename}
          onDelete={onDelete}
          onNewFileInFolder={onNewFileInFolder}
          onNewFolderInFolder={onNewFolderInFolder}
        />
      </ScrollShadow>

      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          fullWidth
          className="justify-between"
          isDisabled={busy}
          aria-keyshortcuts="Meta+N Control+N"
          onPress={handlePrimaryCta}
        >
          <span className="inline-flex items-center gap-2">
            <IconPlus />
            {ctaLabel}
          </span>
          {needsInit ? null : <ShortcutKbd keys={shortcutLabel.newPage()} />}
        </Button>
        <AccountMenu
          workspace={workspace}
          personal={personal}
          busy={busy}
          needsInit={needsInit}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          onConfig={onConfig}
          onFolder={onFolderModal}
          onRefresh={onRefresh}
          onChangeFolder={onChangeFolder}
          onCloseWorkspace={onCloseWorkspace}
        />
      </div>
    </aside>
  );
}
