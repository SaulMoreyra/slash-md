import { Alert, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useEditor } from "../Editor/context";

export function AiEditBanner() {
  const { t } = useTranslation();
  const { ai } = useEditor();

  if (!ai.active) {
    return null;
  }

  const label = ai.streaming
    ? t("editor.aiEditBanner.streaming")
    : ai.partial
      ? t("editor.aiEditBanner.partial")
      : t("editor.aiEditBanner.ready");

  return (
    <Alert
      status="accent"
      className="mx-3 mt-3 animate-fade-in motion-reduce:animate-none"
      role="status"
    >
      <Alert.Content>
        <Alert.Description>{label}</Alert.Description>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onPress={ai.revert}>
            {t("editor.aiEditBanner.discard")}
          </Button>
          <Button size="sm" variant="primary" isDisabled={ai.streaming} onPress={ai.apply}>
            {t("editor.aiEditBanner.apply")}
          </Button>
        </div>
      </Alert.Content>
    </Alert>
  );
}
