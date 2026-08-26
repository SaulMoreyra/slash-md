import { Button, Chip, TextArea } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { ReviewThread } from "../../../shared/api";
import { ThreadCommentList } from "./components/ThreadCommentList";
import { useThreadPopoverController } from "./hooks/useThreadPopoverController";

export type ThreadPopoverProps = {
  thread: ReviewThread;
  canWrite: boolean;
  onClose: () => void;
  onReply: (body: string) => Promise<void>;
  onResolve: (resolved: boolean) => Promise<void>;
  onOpenGithub: () => void;
};

export function ThreadPopover({
  thread,
  canWrite,
  onClose,
  onReply,
  onResolve,
  onOpenGithub,
}: ThreadPopoverProps) {
  const { t } = useTranslation();
  const {
    body,
    onBodyChange,
    statusLabelKey,
    statusColor,
    resolveLabelKey,
    canSubmitReply,
    onSubmitReply,
    onToggleResolve,
  } = useThreadPopoverController({ thread, onReply, onResolve });

  return (
    <div className="thread-popover" role="dialog" aria-label={t("thread.aria")}>
      <header className="thread-popover-head">
        <Chip size="sm" color={statusColor} variant="soft">
          <Chip.Label>{t(statusLabelKey)}</Chip.Label>
        </Chip>
        <Button size="sm" variant="ghost" onPress={onClose}>
          {t("thread.close")}
        </Button>
      </header>
      {thread.snippet ? <blockquote className="thread-popover-snippet">{thread.snippet}</blockquote> : null}
      <ThreadCommentList comments={thread.comments} />
      <footer className="thread-popover-foot">
        <ThreadReplyFooter
          canWrite={canWrite}
          body={body}
          canSubmitReply={canSubmitReply}
          resolveLabel={t(resolveLabelKey)}
          onBodyChange={onBodyChange}
          onSubmitReply={onSubmitReply}
          onToggleResolve={onToggleResolve}
          onOpenGithub={onOpenGithub}
        />
      </footer>
    </div>
  );
}

function ThreadReplyFooter({
  canWrite,
  body,
  canSubmitReply,
  resolveLabel,
  onBodyChange,
  onSubmitReply,
  onToggleResolve,
  onOpenGithub,
}: {
  canWrite: boolean;
  body: string;
  canSubmitReply: boolean;
  resolveLabel: string;
  onBodyChange: (value: string) => void;
  onSubmitReply: () => Promise<void>;
  onToggleResolve: () => void;
  onOpenGithub: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      {canWrite ? (
        <>
          <TextArea
            className="thread-popover-reply"
            rows={2}
            placeholder={t("thread.replyPlaceholder")}
            value={body}
            onChange={(ev) => onBodyChange(ev.target.value)}
            fullWidth
          />
          <div className="thread-popover-actions">
            <Button size="sm" variant="primary" isDisabled={!canSubmitReply} onPress={() => void onSubmitReply()}>
              {t("thread.reply")}
            </Button>
            <Button size="sm" variant="secondary" onPress={onToggleResolve}>
              {resolveLabel}
            </Button>
          </div>
        </>
      ) : null}
      <Button size="sm" variant="ghost" onPress={onOpenGithub}>
        {t("thread.openGithub")}
      </Button>
    </>
  );
}
