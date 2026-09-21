import { Button, Chip, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { AgentRow } from "../hooks/useAgentsModalController";

type Props = {
  row: AgentRow;
  disabled: boolean;
  onLogin: () => void;
  onRecheck: () => void;
};

export function AgentRowView({ row, disabled, onLogin, onRecheck }: Props) {
  const { t } = useTranslation();
  const { info, status, probing } = row;

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-default/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{info.label}</p>
        <p className="truncate text-xs text-muted">{stateLabel(status, probing, info, t)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {probing ? (
          <Spinner size="sm" aria-label={t("home.modals.agents.checking")} />
        ) : (
          <Chip size="sm" variant="soft" color={chipColor(status, info)} className="shrink-0">
            {chipLabel(status, info, t)}
          </Chip>
        )}
        {info.available ? (
          <Button
            size="sm"
            variant={status?.loggedIn === true ? "ghost" : "primary"}
            isDisabled={disabled}
            aria-label={t(status?.loggedIn === true ? "home.modals.agents.recheckAgent" : "home.modals.agents.login")}
            onPress={status?.loggedIn === true ? onRecheck : onLogin}
          >
            {status?.loggedIn === true ? t("home.modals.agents.recheckAgent") : t("home.modals.agents.login")}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function stateLabel(
  status: AgentRow["status"],
  probing: boolean,
  info: AgentRow["info"],
  t: (key: string) => string,
): string {
  if (probing && !status) {
    return t("home.modals.agents.checking");
  }
  if (!info.available) {
    return t("home.modals.agents.notFound");
  }
  if (status?.loggedIn === true) {
    return t("home.modals.agents.loggedIn");
  }
  if (status?.loggedIn === false) {
    return t("home.modals.agents.loggedOut");
  }
  if (status?.loggedIn === null) {
    return t("home.modals.agents.unknownStatus");
  }
  return info.command;
}

function chipLabel(
  status: AgentRow["status"],
  info: AgentRow["info"],
  t: (key: string) => string,
): string {
  if (!info.available) {
    return t("home.chat.unavailable");
  }
  if (status?.loggedIn === true) {
    return t("home.modals.agents.loggedIn");
  }
  if (status?.loggedIn === false) {
    return t("home.modals.agents.loggedOut");
  }
  return t("home.modals.agents.unknown");
}

function chipColor(status: AgentRow["status"], info: AgentRow["info"]): "success" | "warning" | "danger" | "default" {
  if (!info.available || status?.loggedIn === false) {
    return "danger";
  }
  if (status?.loggedIn === true) {
    return "success";
  }
  return "warning";
}