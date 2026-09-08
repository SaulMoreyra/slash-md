import { Avatar, Dropdown } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { WorkspaceInfo } from "../../../../../shared/api";
import { ShortcutKbd, shortcutLabel } from "../../../../components/ShortcutKbd";
import { LanguageSelector } from "../../../../i18n/LanguageSelector";
import { ThemeSelector } from "../../../../theme/ThemeSelector";
import { AccountMenuAction, ChromeTrigger } from "../../enums";
import { isWebHost } from "../../../../host";
import { useAccountMenuController } from "./hooks/useAccountMenuController";

type Props = {
  workspace: WorkspaceInfo;
  personal: boolean;
  busy: boolean;
  needsInit: boolean;
  trigger?: ChromeTrigger;
  onSignIn: () => void;
  onSignOut: () => void;
  onConfig: () => void;
  onFolder: () => void;
  onRefresh: () => void;
  onChangeFolder: () => void;
  onCloseWorkspace: () => void;
};

export function AccountMenu({
  workspace,
  personal: _personal,
  busy,
  needsInit,
  trigger = ChromeTrigger.Row,
  onSignIn,
  onSignOut,
  onConfig,
  onFolder,
  onRefresh,
  onChangeFolder,
  onCloseWorkspace,
}: Props) {
  const { t } = useTranslation();
  const { login, identity, modeLabel, settingsLabel, initLabel, onMenuAction } =
    useAccountMenuController({ workspace });
  const configLabel = needsInit ? initLabel : settingsLabel;
  const busyDisabled = [
    AccountMenuAction.Refresh,
    AccountMenuAction.ChangeFolder,
    AccountMenuAction.CloseWorkspace,
  ];
  const iconOnly = trigger === ChromeTrigger.Icon;
  const webHost = isWebHost();

  return (
    <Dropdown>
      <Dropdown.Trigger
        className={
          iconOnly
            ? "flex size-9 items-center justify-center rounded-2xl hover:bg-default/50"
            : "flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-default/50"
        }
        aria-label={t("home.account.aria")}
      >
        <Avatar size="sm" color="default" aria-hidden>
          <Avatar.Fallback>{login ? login.slice(0, 1).toUpperCase() : "?"}</Avatar.Fallback>
        </Avatar>
        {iconOnly ? null : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{identity}</span>
            <span className="block truncate text-xs text-muted">{modeLabel}</span>
          </span>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover placement="top start">
        <Dropdown.Menu
          aria-label={t("home.account.aria")}
          disabledKeys={busy ? busyDisabled : []}
          onAction={(key) =>
            onMenuAction(String(key), {
              onFolder,
              onConfig,
              onRefresh,
              onChangeFolder,
              onCloseWorkspace,
              onSignOut,
              onSignIn,
            })
          }
        >
          <Dropdown.Item id={AccountMenuAction.Mode} textValue={identity} className="pointer-events-none opacity-70">
            {identity} · {modeLabel}
          </Dropdown.Item>
          {webHost ? null : (
            <>
              <Dropdown.Item id={AccountMenuAction.Folder} textValue={t("home.account.newFolder")} className="gap-3">
                <span className="flex-1">{t("home.account.newFolder")}</span>
                <ShortcutKbd keys={shortcutLabel.newFolder()} />
              </Dropdown.Item>
              <Dropdown.Item id={AccountMenuAction.Config} textValue={configLabel} className="gap-3">
                <span className="flex-1">{configLabel}</span>
                <ShortcutKbd keys={shortcutLabel.settings()} />
              </Dropdown.Item>
              <Dropdown.Item id={AccountMenuAction.Refresh} textValue={t("home.account.refresh")} className="gap-3">
                <span className="flex-1">{t("home.account.refresh")}</span>
                <ShortcutKbd keys={shortcutLabel.refresh()} />
              </Dropdown.Item>
              <Dropdown.Item id={AccountMenuAction.ChangeFolder} textValue={t("home.account.openOther")}>
                {t("home.account.openOther")}
              </Dropdown.Item>
              <Dropdown.Item id={AccountMenuAction.CloseWorkspace} textValue={t("home.account.closeWorkspace")}>
                {t("home.account.closeWorkspace")}
              </Dropdown.Item>
              {workspace.auth ? (
                <Dropdown.Item id={AccountMenuAction.SignOut} textValue={t("home.account.signOut")} className="text-danger">
                  {t("home.account.signOut")}
                </Dropdown.Item>
              ) : (
                <Dropdown.Item id={AccountMenuAction.SignIn} textValue={t("home.account.signIn")}>
                  {t("home.account.signIn")}
                </Dropdown.Item>
              )}
            </>
          )}
        </Dropdown.Menu>
        <div className="flex items-center justify-between gap-2 border-t border-separator p-2">
          <ThemeSelector />
          <LanguageSelector />
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}
