import { Alert, Button } from "@heroui/react";
import { isConflictPublishError } from "@slash-md/core/conflictModel";
import type { WikiSyncStatus } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";
import { publishErrorCopy } from "../../../../../../utils";
import { WikiSyncAlert } from "../../../../../WikiSyncAlert";

type Props = {
  error: string | null;
  merging: boolean;
  wikiSyncStatus: WikiSyncStatus;
  busy: boolean;
  onSync: () => void;
  onOpenConflicts: () => void;
};

export function AlertBanner({ error, merging, wikiSyncStatus, busy, onSync, onOpenConflicts }: Props) {
  const { t } = useTranslation();

  if (isConflictPublishError(error ?? "")) {
    return (
      <Alert status="warning" className="m-3" role="alert">
        <Alert.Content>
          <Alert.Description>{t("home.conflicts.publishBlocked")}</Alert.Description>
          <Button size="sm" variant="primary" isDisabled={busy} onPress={merging ? onOpenConflicts : onSync}>
            {merging ? t("home.conflicts.resolvePages") : t("home.conflicts.sync")}
          </Button>
        </Alert.Content>
      </Alert>
    );
  }

  if (error) {
    const copy = publishErrorCopy(error, t);
    return (
      <Alert status={copy ? "warning" : "danger"} className="m-3" role="alert">
        <Alert.Content>
          <Alert.Description>{copy ?? error}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (wikiSyncStatus === "idle" || wikiSyncStatus === "merging") {
    return null;
  }

  return (
    <div className="m-3">
      <WikiSyncAlert status={wikiSyncStatus} busy={busy} onSync={onSync} onOpenConflicts={onOpenConflicts} />
    </div>
  );
}
