import { useTranslation } from "react-i18next";
import { ReviewModal } from "../../../../../components/ReviewModal";
import { ThreadPopover } from "../../../../../components/ThreadPopover";
import { CommentDraftModal } from "../../CommentDraftModal";
import { useEditor } from "../context";

export function Overlays() {
  const { t } = useTranslation();
  const { threads, comments, chrome } = useEditor();

  return (
    <>
      {threads.openThread ? (
        <ThreadPopover
          thread={threads.openThread}
          canWrite={threads.canWrite}
          onClose={threads.onThreadClose}
          onReply={threads.onThreadReply}
          onResolve={threads.onThreadResolve}
          onOpenGithub={threads.onOpenGithub}
        />
      ) : null}
      {comments.commentDraft ? (
        <CommentDraftModal
          commentDraft={comments.commentDraft}
          commentBody={comments.commentBody}
          onBodyChange={comments.onCommentBodyChange}
          onClose={comments.onCommentDraftCancel}
          onSubmit={comments.onCommentSubmit}
        />
      ) : null}
      {chrome.reviewOpen ? (
        <ReviewModal
          note={t("editor.reviewNote")}
          onClose={chrome.onReviewClose}
          onSend={chrome.onReviewSend}
        />
      ) : null}
    </>
  );
}
