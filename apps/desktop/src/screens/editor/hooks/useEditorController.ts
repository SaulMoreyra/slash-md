import type { AuthInfo, PagePayload } from "../../../../shared/api";
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
  onClose: () => void;
  onCreatePublication?: () => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
};

export function useEditorController({
  page,
  busy,
  focusThreadId,
  trail,
  auth,
  onError,
  onPage,
  onClose,
  onCreatePublication,
  run,
}: EditorScreenProps) {
  const canWrite = page.canWrite !== false;
  const editor = useFormatter({ page, trail, canWrite, onError, onPage, run });
  const threads = useThreads({ page, focusThreadId, run });
  const comments = useComments({ page, run, onThreadsRefresh: threads.onThreadsRefresh });
  const chrome = useEditorChrome({
    page,
    onPage,
    run,
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
