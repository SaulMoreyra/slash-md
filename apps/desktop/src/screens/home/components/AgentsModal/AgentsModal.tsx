import { Button, Modal as HeroModal } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AgentRow } from "./hooks/useAgentsModalController";
import { useAgentsModalController } from "./hooks/useAgentsModalController";
import { AgentRowView } from "./components/AgentRowView";
import { LoginProgress } from "./components/LoginProgress";
import { KeyForm } from "./components/KeyForm";

type Props = {
  onClose: () => void;
};

export function AgentsModal({ onClose }: Props) {
  const { t } = useTranslation();
  const c = useAgentsModalController({ onClose });
  const loggingIn = (c.login?.running ?? false) || (c.keyForm?.busy ?? false);
  const keyRow = c.keyForm ? c.rows.find((row) => row.info.name === c.keyForm?.agent) : null;

  return (
    <HeroModal.Backdrop
      isOpen
      isDismissable={!loggingIn}
      onOpenChange={(open) => {
        if (!open && !loggingIn) {
          c.onClose();
        }
      }}
    >
      <HeroModal.Container size="md">
        <HeroModal.Dialog className="bg-surface" aria-busy={loggingIn}>
          {loggingIn ? null : <HeroModal.CloseTrigger />}
          <HeroModal.Header className="sr-only">
            <HeroModal.Heading>{t("home.modals.agents.title")}</HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex flex-col gap-6 px-8 py-8">
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {t("home.modals.agents.title")}
                </p>
                <p className="mt-2 text-sm text-muted">{t("home.modals.agents.lede")}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                isDisabled={c.refreshing || loggingIn}
                aria-label={t("home.modals.agents.recheck")}
                onPress={() => void c.onRefreshAll()}
              >
                <RefreshCw size={14} className={c.refreshing ? "animate-spin" : undefined} />
              </Button>
            </header>

            <AgentList
              rows={c.rows}
              refreshing={c.refreshing}
              loggingIn={loggingIn}
              loginAgent={c.login?.agent ?? null}
              onLogin={c.onStartLogin}
              onRecheck={c.onRecheckAgent}
            />

            {c.keyForm ? (
              <KeyForm
                form={c.keyForm}
                providers={keyRow?.info.loginProviders ?? []}
                onProvider={c.onProviderChange}
                onKey={c.onKeyChange}
                onSubmit={c.onSubmitKey}
                onCancel={c.onCancelKey}
              />
            ) : null}

            {c.login ? (
              <LoginProgress
                login={c.login}
                onOpenUrl={c.onOpenUrl}
                onAbort={c.onAbortLogin}
                onCopy={c.onCopyCommand}
                onDismiss={c.onDismissLogin}
              />
            ) : null}

            <div className="flex items-center justify-end">
              <Button variant="ghost" isDisabled={loggingIn} onPress={c.onClose}>
                {t("common.close")}
              </Button>
            </div>
          </HeroModal.Body>
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  );
}

function AgentList({
  rows,
  refreshing,
  loggingIn,
  loginAgent,
  onLogin,
  onRecheck,
}: {
  rows: AgentRow[];
  refreshing: boolean;
  loggingIn: boolean;
  loginAgent: string | null;
  onLogin: (agent: string) => void;
  onRecheck: (agent: string) => void;
}) {
  const { t } = useTranslation();

  if (!rows.length) {
    return (
      <p className="rounded-xl bg-default/40 px-4 py-6 text-center text-sm text-muted">
        {refreshing ? t("home.modals.agents.checking") : t("home.modals.agents.none")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <AgentRowView
          key={row.info.name}
          row={row}
          disabled={loggingIn && loginAgent !== row.info.name}
          onLogin={() => onLogin(row.info.name)}
          onRecheck={() => onRecheck(row.info.name)}
        />
      ))}
    </ul>
  );
}