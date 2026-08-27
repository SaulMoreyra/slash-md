import { Button, Modal as HeroModal } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { SignInCliCard } from "./components/SignInCliCard";
import { SignInTokenCard } from "./components/SignInTokenCard";
import { useSignInModalController } from "./hooks/useSignInModalController";

type Props = {
  busy?: boolean;
  onClose: () => void;
  onSave: (token?: string) => void;
};

export function SignInModal({ busy = false, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const c = useSignInModalController({ busy, onSave });

  return (
    <HeroModal.Backdrop
      isOpen
      isDismissable={!busy}
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
        }
      }}
    >
      <HeroModal.Container size="md">
        <HeroModal.Dialog className="bg-surface" aria-busy={busy}>
          {busy ? null : <HeroModal.CloseTrigger />}
          <HeroModal.Header className="sr-only">
            <HeroModal.Heading>{t("home.modals.signIn.title")}</HeroModal.Heading>
          </HeroModal.Header>
          <HeroModal.Body className="flex flex-col gap-6 px-8 py-10">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {t("home.modals.signIn.title")}
              </p>
              <p className="mt-2 text-sm text-muted">{t("home.modals.signIn.lede")}</p>
            </div>
            <SignInCliCard
              status={c.cliStatus}
              login={c.cliLogin}
              copied={c.copied}
              command={c.command}
              busy={busy}
              onCopy={c.onCopyCommand}
              onUseCli={() => void c.onUseCli()}
            />
            <SignInTokenCard
              token={c.token}
              busy={busy}
              canConnect={c.canConnectToken}
              onTokenChange={c.onTokenChange}
              onOpenTokenPage={c.onOpenTokenPage}
              onConnect={c.onConnectToken}
            />
            <div className="flex items-center justify-end">
              <Button variant="ghost" isDisabled={busy} onPress={onClose}>
                {t("common.cancel")}
              </Button>
            </div>
          </HeroModal.Body>
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  );
}
