import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../../components/Modal";

type Props = {
  onClose: () => void;
  onSave: (token?: string) => void;
};

export function SignInModal({ onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  return (
    <Modal title={t("home.modals.signIn.title")} onClose={onClose}>
      <p className="lede">{t("home.modals.signIn.lede")}</p>
      <TextField name="token" fullWidth value={token} onChange={setToken}>
        <Label>{t("home.modals.signIn.token")}</Label>
        <Input type="password" placeholder={t("home.modals.signIn.placeholder")} />
      </TextField>
      <div className="hang-actions">
        <Button variant="ghost" onPress={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" onPress={() => onSave(token.trim() || undefined)}>
          {t("home.modals.signIn.connect")}
        </Button>
      </div>
    </Modal>
  );
}
