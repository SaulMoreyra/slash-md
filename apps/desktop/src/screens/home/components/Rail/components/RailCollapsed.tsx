import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconPanel, IconPlus, IconSearch } from "../../../../../components/icons";
import { shortcutLabel } from "../../../../../components/ShortcutKbd";
import type { HomeTreePayload, WorkspaceInfo } from "../../../../../../shared/api";
import { ChromeTrigger, CreateIntent } from "../../../enums";
import type { NavView } from "../../../types";
import { AccountMenu } from "../../AccountMenu";
import { WorkspaceSwitch } from "../../WorkspaceSwitch";
import { RailBrand } from "./RailBrand";
import { RailCollapsedNav } from "./RailCollapsedNav";

type Props = {
  title: string;
  nav: NavView;
  payload: HomeTreePayload | null;
  isWorkspace: boolean;
  busy: boolean;
  workspace: WorkspaceInfo;
  personal: boolean;
  createIntent: CreateIntent;
  railOpen: boolean;
  onToggle: () => void;
  onChangeFolder: () => void;
  onCloseWorkspace: () => void;
  onConfig: () => void;
  onOpenSearch: () => void;
  onNav: (nav: NavView) => void;
  onInit: () => void;
  onNewPage: () => void;
  onNewPublication?: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onFolderModal: () => void;
  onRefresh: () => void;
};

export function RailCollapsed({
  title,
  nav,
  payload,
  isWorkspace,
  busy,
  workspace,
  personal,
  createIntent,
  railOpen,
  onToggle,
  onChangeFolder,
  onCloseWorkspace,
  onConfig,
  onOpenSearch,
  onNav,
  onInit,
  onNewPage,
  onNewPublication,
  onSignIn,
  onSignOut,
  onFolderModal,
  onRefresh,
}: Props) {
  const { t } = useTranslation();
  const needsInit = Boolean(payload?.needsInit);
  const canWrite = payload?.canWrite ?? true;
  const showPublicationCta = isWorkspace && !canWrite;
  const inboxCount = payload?.inbox.length ?? 0;
  const toggleLabel = railOpen ? t("home.rail.close") : t("home.rail.open");

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
      className="flex h-full min-h-0 w-12 shrink-0 flex-col items-center gap-1 py-1"
      aria-label={t("home.rail.aria")}
    >
      <RailBrand size={22} />
      <WorkspaceSwitch
        title={title}
        trigger={ChromeTrigger.Icon}
        onChangeFolder={onChangeFolder}
        onCloseWorkspace={onCloseWorkspace}
        onConfig={onConfig}
      />
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`${toggleLabel} (${shortcutLabel.toggleRail()})`}
        onPress={onToggle}
      >
        <IconPanel />
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        isDisabled={needsInit}
        aria-label={`${t("home.nav.search")} (${shortcutLabel.search()})`}
        onPress={onOpenSearch}
      >
        <IconSearch />
      </Button>
      <RailCollapsedNav
        nav={nav}
        isWorkspace={isWorkspace}
        inboxCount={inboxCount}
        onNav={onNav}
      />
      <div className="min-h-0 flex-1" />
      <Button
        isIconOnly
        size="sm"
        variant="primary"
        isDisabled={busy}
        aria-label={`${ctaLabel} (${shortcutLabel.newPage()})`}
        onPress={handlePrimaryCta}
      >
        <IconPlus />
      </Button>
      <AccountMenu
        workspace={workspace}
        personal={personal}
        busy={busy}
        needsInit={needsInit}
        trigger={ChromeTrigger.Icon}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onConfig={onConfig}
        onFolder={onFolderModal}
        onRefresh={onRefresh}
        onChangeFolder={onChangeFolder}
        onCloseWorkspace={onCloseWorkspace}
      />
    </aside>
  );
}
