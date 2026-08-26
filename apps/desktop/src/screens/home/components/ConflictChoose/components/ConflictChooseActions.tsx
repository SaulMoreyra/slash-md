import { Button } from "@heroui/react";
import type { ConflictFileKind } from "@slash-md/core/homeTypes";
import { useTranslation } from "react-i18next";

type Props = {
  kind: ConflictFileKind;
  busy: boolean;
  onReview: () => void;
  onKeepMine: () => void;
  onRequestUseWiki: () => void;
};

export function ConflictChooseActions({ kind, busy, onReview, onKeepMine, onRequestUseWiki }: Props) {
  const { t } = useTranslation();

  if (kind === "binary") {
    return (
      <>
        <Button variant="primary" isDisabled={busy} onPress={onKeepMine}>
          {t("home.conflicts.keepMine")}
        </Button>
        <Button variant="ghost" isDisabled={busy} onPress={onRequestUseWiki}>
          {t("home.conflicts.useWiki")}
        </Button>
      </>
    );
  }

  if (kind === "deleted_on_wiki") {
    return (
      <>
        <Button variant="primary" isDisabled={busy} onPress={onKeepMine}>
          {t("home.conflicts.keepPage")}
        </Button>
        <Button variant="ghost" isDisabled={busy} onPress={onRequestUseWiki}>
          {t("home.conflicts.acceptDelete")}
        </Button>
      </>
    );
  }

  if (kind === "deleted_on_publication") {
    return (
      <>
        <Button variant="primary" isDisabled={busy} onPress={onRequestUseWiki}>
          {t("home.conflicts.restoreWiki")}
        </Button>
        <Button variant="ghost" isDisabled={busy} onPress={onKeepMine}>
          {t("home.conflicts.confirmDelete")}
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="primary" isDisabled={busy} onPress={onReview}>
        {t("home.conflicts.review")}
      </Button>
      <Button variant="ghost" isDisabled={busy} onPress={onKeepMine}>
        {t("home.conflicts.keepMine")}
      </Button>
      <Button variant="ghost" isDisabled={busy} onPress={onRequestUseWiki}>
        {t("home.conflicts.useWiki")}
      </Button>
    </>
  );
}
