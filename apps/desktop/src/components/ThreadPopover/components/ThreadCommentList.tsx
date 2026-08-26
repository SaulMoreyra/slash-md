import { Avatar } from "@heroui/react";
import type { ReviewThread } from "../../../../shared/api";

type Comment = ReviewThread["comments"][number];

export function ThreadCommentList({ comments }: { comments: Comment[] }) {
  return (
    <div className="thread-popover-comments">
      {comments.map((comment) => (
        <ThreadComment key={comment.id} comment={comment} />
      ))}
    </div>
  );
}

function ThreadComment({ comment }: { comment: Comment }) {
  return (
    <article className="thread-popover-comment">
      <Avatar size="sm" color="default" aria-hidden>
        <Avatar.Fallback>{(comment.author || "?").slice(0, 1).toUpperCase()}</Avatar.Fallback>
      </Avatar>
      <div className="thread-popover-col">
        <div className="thread-popover-meta">{comment.author}</div>
        <div className="thread-popover-body">{comment.body}</div>
      </div>
    </article>
  );
}
