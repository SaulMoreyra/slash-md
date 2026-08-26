import { Input, Label, TextField } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Modal } from "../Modal";
import { ReviewModalActions } from "./components/ReviewModalActions";
import { ReviewPreviewBody } from "./components/ReviewPreviewBody";
import { useReviewModalController } from "./hooks/useReviewModalController";
import type { ReviewModalHub } from "./types";

export type ReviewModalProps = {
  onClose: () => void;
  onSend: (reviewers: string, excludePaths?: string[]) => void;
  note?: string;
  hub?: ReviewModalHub;
};

export type { ReviewModalHub };

export function ReviewModal({ onClose, onSend, note, hub }: ReviewModalProps) {
  const { t } = useTranslation();
  const {
    reviewers,
    onReviewersChange,
    items,
    loading,
    isEmpty,
    canSend,
    excluded,
    onToggleExclude,
    people,
    excludePaths,
  } = useReviewModalController();

  return (
    <Modal title={t("modal.review.title")} onClose={onClose}>
      {note ? <p className="lede">{note}</p> : null}
      {hub?.publishHint ? <p className="text-sm text-muted">{hub.publishHint}</p> : null}
      <ReviewPreviewBody
        loading={loading}
        isEmpty={isEmpty}
        items={items}
        excluded={excluded}
        people={people}
        onToggleExclude={onToggleExclude}
      />
      {canSend ? (
        <TextField name="reviewers" fullWidth value={reviewers} onChange={onReviewersChange}>
          <Label>{t("modal.review.reviewers")}</Label>
          <Input placeholder={t("modal.review.reviewersPlaceholder")} />
        </TextField>
      ) : null}
      <ReviewModalActions
        canSend={canSend}
        hub={hub}
        onClose={onClose}
        onSend={() => onSend(reviewers, excludePaths)}
      />
    </Modal>
  );
}
