import { Button, TextArea, TextField, Label } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../../components/Modal";

type Props = {
  commentDraft: string;
  commentBody: string;
  onBodyChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CommentDraftModal({ commentDraft, commentBody, onBodyChange, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  return (
    <Modal title={t("editor.comment.title")} onClose={onClose}>
      <blockquote className="thread-popover-snippet">{commentDraft}</blockquote>
      <TextField name="comment" fullWidth value={commentBody} onChange={onBodyChange}>
        <Label className="visually-hidden">{t("editor.comment.label")}</Label>
        <TextArea rows={4} placeholder={t("editor.comment.placeholder")} />
      </TextField>
      <div className="hang-actions">
        <Button variant="ghost" onPress={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" isDisabled={!commentBody.trim()} onPress={onSubmit}>
          {t("editor.comment.submit")}
        </Button>
      </div>
    </Modal>
  );
}
