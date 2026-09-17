import { useHomeOptional } from "../../home/components/Home/context";
import type { AuthInfo, PagePayload } from "../../../../shared/api";
import type { RunOp } from "../../home/types";
import { useComments } from "./useComments";
import { useEditorChrome } from "./useEditorChrome";
import { useFindInPage } from "./useFindInPage";
import { useFormatter } from "./useFormatter";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { usePageWidth } from "./usePageWidth";
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
  const home = useHomeOptional();
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
  const find = useFindInPage({
    docPath: page.path,
    onThreadClose: threads.onThreadClose,
    onCloseLibrarySearch: home?.search.onClose,
  });
  const resize = usePageWidth();

  useKeyboardShortcuts({ onClose, editor, threads, comments, chrome, find });

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
    find,
    resize,
  };
}

export type EditorControllerApi = ReturnType<typeof useEditorController>;
