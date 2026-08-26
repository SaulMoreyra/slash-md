import { Alert, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useHomeOptional } from "../../../home/components/Home/context";
import { useEditor } from "../Editor/context";

export function ResolveConflictBanner() {
  const { t } = useTranslation();
  const home = useHomeOptional();
  const { page, editor } = useEditor();
  const resolving =
    Boolean(home?.conflicts.editing) && home?.conflicts.selected?.path === page.path;

  if (!home || !resolving) {
    return null;
  }

  const onMarkResolved = home.conflicts.onMarkResolved;

  async function markResolved() {
    await editor.onFlushSave();
    await onMarkResolved(editor.getMarkdown());
  }

  return (
    <Alert status="warning" className="mx-3 mt-3 animate-fade-in motion-reduce:animate-none" role="status">
      <Alert.Content>
        <Alert.Description>{t("editor.conflicts.resolving")}</Alert.Description>
        <Button size="sm" variant="primary" onPress={() => void markResolved()}>
          {t("editor.conflicts.markResolved")}
        </Button>
      </Alert.Content>
    </Alert>
  );
}
