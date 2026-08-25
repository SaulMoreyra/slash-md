import { useState } from "react";
import type { ReviewThread } from "../../shared/api";

type Props = {
  thread: ReviewThread;
  canWrite: boolean;
  onClose: () => void;
  onReply: (body: string) => Promise<void>;
  onResolve: (resolved: boolean) => Promise<void>;
  onOpenGithub: () => void;
};

export function ThreadPopover({ thread, canWrite, onClose, onReply, onResolve, onOpenGithub }: Props) {
  const [body, setBody] = useState("");
  return (
    <div className="thread-popover" role="dialog" aria-label="Review thread">
      <header className="thread-popover-head">
        <span className={thread.isResolved ? "thread-popover-status is-resolved" : "thread-popover-status"}>
          {thread.isResolved ? "Resolved" : "Open thread"}
        </span>
        <button type="button" className="thread-popover-close" onClick={onClose}>
          Close
        </button>
      </header>
      {thread.snippet ? <blockquote className="thread-popover-snippet">{thread.snippet}</blockquote> : null}
      <div className="thread-popover-comments">
        {thread.comments.map((comment) => (
          <article key={comment.id} className="thread-popover-comment">
            <div className="thread-popover-av" aria-hidden>
              {(comment.author || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="thread-popover-col">
              <div className="thread-popover-meta">{comment.author}</div>
              <div className="thread-popover-body">{comment.body}</div>
            </div>
          </article>
        ))}
      </div>
      <footer className="thread-popover-foot">
        {canWrite ? (
          <>
            <textarea
              className="thread-popover-reply"
              rows={2}
              placeholder="Write a reply"
              value={body}
              onChange={(ev) => setBody(ev.target.value)}
            />
            <div className="thread-popover-actions">
              <button
                type="button"
                className="thread-btn thread-btn-primary"
                disabled={!body.trim()}
                onClick={async () => {
                  await onReply(body);
                  setBody("");
                }}
              >
                Reply
              </button>
              <button type="button" className="thread-btn" onClick={() => void onResolve(!thread.isResolved)}>
                {thread.isResolved ? "Unresolve" : "Resolve"}
              </button>
            </div>
          </>
        ) : null}
        <button type="button" className="thread-btn" onClick={onOpenGithub}>
          Open on GitHub
        </button>
      </footer>
    </div>
  );
}
