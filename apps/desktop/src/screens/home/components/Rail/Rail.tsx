import { Avatar, Button, ScrollShadow } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconPanel, IconPlus, IconSearch } from "../../../../components/icons";
import { ShortcutKbd, shortcutLabel } from "../../../../components/ShortcutKbd";
import { Tree } from "../../../../components/Tree";
import type {
  HomeTreeNode,
  HomeTreePayload,
  WorkspaceInfo,
} from "../../../../../shared/api";
import { CreateIntent } from "../../enums";
import type { NavView } from "../../types";
import { AccountMenu } from "../AccountMenu";
import { PaneCloseButton } from "../PaneCloseButton";
import { WorkspaceSwitch } from "../WorkspaceSwitch";
import { RailNav } from "./components/RailNav";

type Props = {
  title: string;
  nav: NavView;
  payload: HomeTreePayload | null;
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
  onRename?: (node: HomeTreeNode) => void;
  onDelete?: (node: HomeTreeNode) => void;
  onInit: () => void;
  onNewPage: () => void;
  createIntent?: CreateIntent;
  onSignIn: () => void;
  onSignOut: () => void;
  onFolderModal: () => void;
  onRefresh: () => void;
  onNewPublication?: () => void;
};

export function Rail({
  title,
  nav,
  payload,
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
  onRename,
  onDelete,
  onInit,
  onNewPage,
  createIntent = CreateIntent.Page,
  onSignIn,
  onSignOut,
  onFolderModal,
  onRefresh,
  onNewPublication,
}: Props) {
  const { t } = useTranslation();
  const login = workspace.auth?.login;
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
      <div className="flex items-center gap-2 px-1 pt-1">
        <Avatar size="sm" color="accent">
          <Avatar.Fallback>
            {(login ?? title).slice(0, 1).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <WorkspaceSwitch
            title={title}
            subtitle={payload?.publication?.branch}
            onChangeFolder={onChangeFolder}
            onCloseWorkspace={onCloseWorkspace}
            onConfig={onConfig}
          />
        </div>
        <PaneCloseButton
          label={t("home.rail.close")}
          keys={shortcutLabel.toggleRail()}
          onPress={onCloseRail}
        >
          <IconPanel />
        </PaneCloseButton>
      </div>

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

      <ScrollShadow className="min-h-0 flex-1 [--scroll-shadow-scrollbar-size:0px]">
        <RailNav
          nav={nav}
          payload={payload}
          isWorkspace={isWorkspace}
          onNav={onNav}
        />
        {!needsInit ? (
          <div className="mt-1 px-1">
            <Tree
              nodes={roots}
              selected={treeSelected}
              expanded={expanded}
              canWrite={canWrite}
              onFile={onFile}
              onFolder={onFolder}
              onToggle={onToggle}
              onRename={onRename}
              onDelete={onDelete}
            />
          </div>
        ) : null}
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
