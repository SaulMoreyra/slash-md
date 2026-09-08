import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { PagePayload } from "../../../../../shared/api";
import { LifecycleKind, PageKind, RepoMode } from "../../enums";

type Lifecycle = { kind: LifecycleKind };

type Props = {
  page: PagePayload;
  busy: boolean;
  lifecycle: Lifecycle;
  openPr: string | null | undefined;
  reviewable: boolean;
  onCloseMore: () => void;
  onFlushSave: () => Promise<void>;
  onOpenReviewModal: () => void | Promise<void>;
  onPublishPersonal: () => Promise<void>;
};

export function EditorMoreActions({
  page,
  busy,
  lifecycle,
  openPr,
  reviewable,
  onCloseMore,
  onFlushSave,
  onOpenReviewModal,
  onPublishPersonal,
}: Props) {
  const { t } = useTranslation();
  const api = () => window.slashmd;

  if (page.repoMode === RepoMode.Personal && page.canWrite !== false) {
    return (
      <Button
        variant="ghost"
        isDisabled={busy}
        onPress={async () => {
          onCloseMore();
          await onFlushSave();
          await onPublishPersonal();
        }}
      >
        {t("editor.publish")}
      </Button>
    );
  }

  if (page.repoMode === RepoMode.Workspace && page.pageKind === PageKind.Wiki) {
    const hasPublication = Boolean(page.publication);
    return (
      <>
        {lifecycle.kind === LifecycleKind.InReview && openPr ? (
          <Button
            variant="ghost"
            onPress={() => {
              onCloseMore();
              void api().openUrl(openPr);
            }}
          >
            {t("editor.openPr")}
          </Button>
        ) : null}
        {hasPublication && reviewable ? (
          <Button
            variant="ghost"
            isDisabled={busy}
            onPress={() => {
              onCloseMore();
              void onOpenReviewModal();
            }}
          >
            {lifecycle.kind === LifecycleKind.InReview ? t("editor.updateReview") : t("editor.sendReview")}
          </Button>
        ) : null}
      </>
    );
  }

  return <p className="px-2 text-sm text-muted">{t("editor.noExtraActions")}</p>;
}
