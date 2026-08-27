import { Button, Input, Label, TextField } from "@heroui/react";
import { useTranslation } from "react-i18next";

type Props = {
  token: string;
  busy: boolean;
  canConnect: boolean;
  onTokenChange: (value: string) => void;
  onOpenTokenPage: () => void;
  onConnect: () => void;
};

export function SignInTokenCard({
  token,
  busy,
  canConnect,
  onTokenChange,
  onOpenTokenPage,
  onConnect,
}: Props) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-default/40 px-4 py-4">
      <p className="text-sm font-medium text-foreground">{t("home.modals.signIn.tokenTitle")}</p>
      <p className="text-xs text-muted">{t("home.modals.signIn.tokenLede")}</p>
      <div>
        <Button size="sm" variant="ghost" isDisabled={busy} onPress={onOpenTokenPage}>
          {t("home.modals.signIn.tokenCreate")}
        </Button>
      </div>
      <TextField name="token" fullWidth value={token} onChange={onTokenChange} isDisabled={busy}>
        <Label>{t("home.modals.signIn.token")}</Label>
        <Input type="password" placeholder={t("home.modals.signIn.placeholder")} />
      </TextField>
      <div>
        <Button variant="primary" isDisabled={!canConnect} onPress={onConnect}>
          {t("home.modals.signIn.connect")}
        </Button>
      </div>
    </section>
  );
}
