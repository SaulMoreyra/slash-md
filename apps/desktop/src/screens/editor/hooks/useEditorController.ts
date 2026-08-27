import type { AuthInfo, PagePayload } from "../../../../shared/api";
import type { RunOp } from "../../home/types";
import { useComments } from "./useComments";
import { useEditorChrome } from "./useEditorChrome";
import { useFormatter } from "./useFormatter";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useThreads } from "./useThreads";

export type EditorScreenProps = {
  page: PagePayload;
  busy: boolean;
  focusThreadId?: string | null;
  trail?: string;
  auth: AuthInfo;
  onError: (message: string | null) => void;
  onPage: (page: PagePayload) => void;
  onRefresh: () => Promise<void>;
  onClose: () => void;
  onCreatePublication?: () => void;
  runOp: RunOp;
};

export function useEditorController({
  page,
  busy,
  focusThreadId,
  trail,
  auth,
  onError,
  onPage,
  onRefresh,
  onClose,
  onCreatePublication,
  runOp,
}: EditorScreenProps) {
  const canWrite = page.canWrite !== false;
  const editor = useFormatter({ page, trail, canWrite, onError, onPage, runOp });
  const threads = useThreads({ page, focusThreadId, runOp });
  const comments = useComments({ page, runOp, onThreadsRefresh: threads.onThreadsRefresh });
  const chrome = useEditorChrome({
    page,
    onPage,
    onRefresh,
    runOp,
    onFlushSave: editor.onFlushSave,
  });

  useKeyboardShortcuts({ onClose, editor, threads, comments, chrome });

  return {
    page,
    busy,
    auth,
    onClose,
    onCreatePublication,
    editor: { ...editor, commentsOn: comments.commentsOn },
    threads,
    comments,
    chrome,
  };
}

export type EditorControllerApi = ReturnType<typeof useEditorController>;
