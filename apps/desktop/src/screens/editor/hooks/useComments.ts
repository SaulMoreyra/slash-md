import { useState } from "react";
import { reviewThreadTarget } from "@slash-md/core/threadGate";
import type { PagePayload } from "../../../../shared/api";
import { AppOperation } from "../../../App/enums";
import type { RunOp } from "../../home/types";

const api = () => window.slashmd;

type Params = {
  page: PagePayload;
  runOp: RunOp;
  onThreadsRefresh: () => Promise<unknown>;
};

export function useComments({ page, runOp, onThreadsRefresh }: Params) {
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
    const created = await runOp(AppOperation.ThreadCreate, async () => {
      await api().threadCreate(page.path, commentDraft, commentBody);
      await onThreadsRefresh();
      return true;
    });
    if (!created) {
      return;
    }
    setCommentDraft(null);
    setCommentBody("");
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
