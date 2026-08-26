import { useTranslation } from "react-i18next";
import type { WorkspaceInfo } from "../../../../../../shared/api";
import { AccountMenuAction, RepoMode } from "../../../enums";

type Params = {
  workspace: WorkspaceInfo;
};

type MenuHandlers = {
  onFolder: () => void;
  onConfig: () => void;
  onRefresh: () => void;
  onChangeFolder: () => void;
  onCloseWorkspace: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
};

export function useAccountMenuController({ workspace }: Params) {
  const { t } = useTranslation();
  const login = workspace.auth?.login;
  const signedOut = t("home.account.signedOut");
  const mode = workspace.config?.mode ?? workspace.slashmd.mode;
  const modeLabel = labelForRepoMode(mode, t);
  const identity = login ? `@${login}` : signedOut;
  const settingsLabel = t("home.account.settings");
  const initLabel = t("home.account.initWorkspace");

  function onMenuAction(key: string, handlers: MenuHandlers) {
    switch (key) {
      case AccountMenuAction.Folder:
        handlers.onFolder();
        break;
      case AccountMenuAction.Config:
        handlers.onConfig();
        break;
      case AccountMenuAction.Refresh:
        handlers.onRefresh();
        break;
      case AccountMenuAction.ChangeFolder:
        handlers.onChangeFolder();
        break;
      case AccountMenuAction.CloseWorkspace:
        handlers.onCloseWorkspace();
        break;
      case AccountMenuAction.SignOut:
        handlers.onSignOut();
        break;
      case AccountMenuAction.SignIn:
        handlers.onSignIn();
        break;
      default:
        break;
    }
  }

  return {
    login,
    identity,
    modeLabel,
    settingsLabel,
    initLabel,
    onMenuAction,
  };
}

function labelForRepoMode(mode: string | undefined, t: (key: "common.local" | "common.personal" | "common.workspace") => string): string {
  if (mode === RepoMode.Local) {
    return t("common.local");
  }
  if (mode === RepoMode.Personal) {
    return t("common.personal");
  }
  return t("common.workspace");
}
