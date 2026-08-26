import { useState } from "react";
import { reviewThreadTarget } from "@slash-md/core/threadGate";
import type { PagePayload } from "../../../../shared/api";

const api = () => window.slashmd;

type Params = {
  page: PagePayload;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  onThreadsRefresh: () => Promise<unknown>;
};

export function useComments({ page, run, onThreadsRefresh }: Params) {
  const commentsOn = Boolean(reviewThreadTarget({ markdown: page.markdown, fileRemotePath: page.path }));
  const [commentDraft, setCommentDraft] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");

  function onCommentDraftStart(draft: string) {
    setCommentDraft(draft);
  }

  function onCommentDraftCancel() {
    setCommentDraft(null);
  }

  function onCommentBodyChange(body: string) {
    setCommentBody(body);
  }

  async function onCommentSubmit() {
    if (!commentDraft) {
      return;
    }
    await run(() => api().threadCreate(page.path, commentDraft, commentBody));
    setCommentDraft(null);
    setCommentBody("");
    await onThreadsRefresh();
  }

  return {
    commentsOn,
    commentDraft,
    commentBody,
    onCommentDraftStart,
    onCommentDraftCancel,
    onCommentBodyChange,
    onCommentSubmit,
  };
}

export type CommentsApi = ReturnType<typeof useComments>;
