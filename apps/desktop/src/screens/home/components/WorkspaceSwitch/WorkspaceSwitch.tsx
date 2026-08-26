import { Avatar, Dropdown } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { IconBranch, IconUnfold } from "../../../../components/icons";
import { ShortcutKbd, shortcutLabel } from "../../../../components/ShortcutKbd";
import { AccountMenuAction, ChromeTrigger } from "../../enums";
import { initials } from "../../utils";

type Props = {
  title: string;
  subtitle?: string;
  trigger?: ChromeTrigger;
  onChangeFolder: () => void;
  onCloseWorkspace: () => void;
  onConfig: () => void;
};

export function WorkspaceSwitch({
  title,
  subtitle,
  trigger = ChromeTrigger.Row,
  onChangeFolder,
  onCloseWorkspace,
  onConfig,
}: Props) {
  const { t } = useTranslation();
  const iconOnly = trigger === ChromeTrigger.Icon;

  return (
    <Dropdown>
      <Dropdown.Trigger
        className={
          iconOnly
            ? "flex size-9 items-center justify-center rounded-xl hover:bg-default/40"
            : "flex w-full min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-default/40"
        }
        aria-label={t("home.workspaceSwitch.aria")}
      >
        {iconOnly ? (
          <Avatar size="sm" color="accent">
            <Avatar.Fallback>{initials(title)}</Avatar.Fallback>
          </Avatar>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{title}</span>
            {subtitle ? (
              <span
                className="mt-0.5 flex min-w-0 items-center gap-1 font-mono text-[11px] leading-none text-muted"
                title={subtitle}
              >
                <IconBranch size={11} />
                <span className="min-w-0 truncate">{subtitle}</span>
              </span>
            ) : null}
          </span>
        )}
        {iconOnly ? null : <IconUnfold />}
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu
          aria-label={t("home.workspaceSwitch.aria")}
          onAction={(key) => {
            switch (String(key)) {
              case AccountMenuAction.Config:
                onConfig();
                break;
              case AccountMenuAction.ChangeFolder:
                onChangeFolder();
                break;
              case AccountMenuAction.CloseWorkspace:
                onCloseWorkspace();
                break;
              default:
                break;
            }
          }}
        >
          <Dropdown.Item id={AccountMenuAction.Config} textValue={t("home.account.settings")} className="gap-3">
            <span className="flex-1">{t("home.account.settings")}</span>
            <ShortcutKbd keys={shortcutLabel.settings()} />
          </Dropdown.Item>
          <Dropdown.Item id={AccountMenuAction.ChangeFolder} textValue={t("home.account.openOther")}>
            {t("home.account.openOther")}
          </Dropdown.Item>
          <Dropdown.Item id={AccountMenuAction.CloseWorkspace} textValue={t("home.account.closeWorkspace")}>
            {t("home.account.closeWorkspace")}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
