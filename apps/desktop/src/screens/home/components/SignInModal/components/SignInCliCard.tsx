import { Alert, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { GhCliStatus } from "../../../enums";

type Props = {
  status: GhCliStatus;
  login: string | null;
  copied: boolean;
  command: string;
  busy: boolean;
  onCopy: () => void;
  onUseCli: () => void;
};

export function SignInCliCard({ status, login, copied, command, busy, onCopy, onUseCli }: Props) {
  const { t } = useTranslation();
  const connectLabel =
    status === GhCliStatus.Ready && login
      ? t("home.modals.signIn.cliConnectAs", { login })
      : t("home.modals.signIn.cliRecheck");

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-default/40 px-4 py-4">
      <p className="text-sm font-medium text-foreground">{t("home.modals.signIn.cliTitle")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-background/60 px-2.5 py-1 font-mono text-sm">{command}</code>
        <Button size="sm" variant="ghost" isDisabled={busy} onPress={onCopy}>
          {copied ? t("home.modals.signIn.cliCopied") : t("home.modals.signIn.cliCopy")}
        </Button>
      </div>
      <p className="text-xs text-muted">{t("home.modals.signIn.cliHint")}</p>
      <CliStatusBody status={status} login={login} />
      <div>
        <Button
          variant="primary"
          isDisabled={busy || status === GhCliStatus.Loading}
          onPress={onUseCli}
        >
          {connectLabel}
        </Button>
      </div>
    </section>
  );
}

function CliStatusBody({ status, login }: { status: GhCliStatus; login: string | null }) {
  const { t } = useTranslation();
  if (status === GhCliStatus.Loading) {
    return <p className="text-sm text-muted">{t("home.modals.signIn.cliChecking")}</p>;
  }
  if (status === GhCliStatus.Ready) {
    return (
      <Alert status="success">
        <Alert.Content>
          <Alert.Description>{t("home.modals.signIn.cliReady", { login })}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }
  if (status === GhCliStatus.LoggedOut) {
    return (
      <Alert status="warning">
        <Alert.Content>
          <Alert.Description>{t("home.modals.signIn.cliLoggedOut")}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }
  return (
    <Alert status="danger">
      <Alert.Content>
        <Alert.Description>{t("home.modals.signIn.cliMissing")}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
