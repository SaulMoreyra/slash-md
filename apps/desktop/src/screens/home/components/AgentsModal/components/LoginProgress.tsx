import { Button, ScrollShadow } from "@heroui/react";
import { CircleCheck, CircleX, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentLoginView } from "../hooks/useAgentsModalController";

type Props = {
  login: AgentLoginView;
  onOpenUrl: (url: string) => void;
  onAbort: () => void;
  onCopy: (agent: string) => void;
  onDismiss: () => void;
};

export function LoginProgress({ login, onOpenUrl, onAbort, onCopy, onDismiss }: Props) {
  const { t } = useTranslation();
  const running = login.running;
  const success = login.done && login.ok === true;
  const failed = login.done && login.ok === false;

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-separator bg-default/40 px-4 py-3"
      aria-label={t("home.modals.agents.loginProgress")}
    >
      <header className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          {success ? (
            <CircleCheck size={16} className="text-success" />
          ) : failed ? (
            <CircleX size={16} className="text-danger" />
          ) : null}
          {running
            ? t("home.modals.agents.loggingIn", { agent: login.agent })
            : success
              ? t("home.modals.agents.loginOk")
              : t("home.modals.agents.loginFailed")}
        </p>
        {running ? (
          <Button size="sm" variant="ghost" onPress={onAbort}>
            {t("common.cancel")}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onPress={onDismiss}>
            {t("common.close")}
          </Button>
        )}
      </header>

      {login.url ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted">{t("home.modals.agents.openUrlHint")}</p>
          <Button size="sm" variant="primary" onPress={() => onOpenUrl(login.url!)}>
            <ExternalLink size={13} />
            {t("home.modals.agents.openBrowser")}
          </Button>
        </div>
      ) : null}

      {login.lines.length ? (
        <ScrollShadow className="max-h-40 overflow-auto rounded-lg bg-background px-3 py-2">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-muted">
            {login.lines.join("")}
          </pre>
        </ScrollShadow>
      ) : null}

      {failed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger/10 px-3 py-2">
          <p className="text-xs text-danger">{login.error}</p>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t("home.modals.agents.copyCommand")}
            onPress={() => onCopy(login.agent)}
          >
            {login.copied ? t("home.modals.agents.copied") : t("home.modals.agents.copyCommand")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}