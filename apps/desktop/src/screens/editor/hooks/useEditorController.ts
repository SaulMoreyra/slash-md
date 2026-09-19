import { useCallback, useEffect, useRef } from "react";
import { useHomeOptional } from "../../home/components/Home/context";
import type { AuthInfo, PagePayload } from "../../../../shared/api";
import type { PageChatHost } from "../../chat";
import type { RunOp } from "../../home/types";
import { useComments } from "./useComments";
import { useEditorChrome } from "./useEditorChrome";
import { useFindInPage } from "./useFindInPage";
import { useFormatter } from "./useFormatter";
import { useAiWriter } from "./useAiWriter";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { usePageWidth } from "./usePageWidth";
import { useThreads } from "./useThreads";

export type EditorScreenProps = {
  page: PagePayload;
  busy: boolean;
  focusThreadId?: string | null;
  trail?: string;
  auth: AuthInfo;
  active?: boolean;
  onError: (message: string | null) => void;
  onPage: (page: PagePayload) => void;
  onRefresh: () => Promise<void>;
  onClose: () => void;
  onCreatePublication?: () => void;
  onDirtyChange?: (key: string, dirty: boolean) => void;
  runOp: RunOp;
};

export function useEditorController({
  page,
  busy,
  focusThreadId,
  trail,
  auth,
  active = true,
  onError,
  onPage,
  onRefresh,
  onClose,
  onCreatePublication,
  onDirtyChange,
  runOp,
}: EditorScreenProps) {
  const home = useHomeOptional();
  const canWrite = page.canWrite !== false;
  const editor = useFormatter({
    page,
    trail,
    canWrite,
    onError,
    onPage,
    runOp,
    active,
    onDirtyChange,
  });
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
    isActive: active,
    onThreadClose: threads.onThreadClose,
    onCloseLibrarySearch: home?.search.onClose,
  });
  const resize = usePageWidth();
  const ai = useAiWriter({
    getMarkdown: editor.getMarkdown,
    setBodyMarkdown: editor.setMarkdown,
    onBodyChange: editor.onBodyMarkdownChange,
    setEditable: editor.setEditable,
  });

  const hostRef = useRef<PageChatHost>({
    getMarkdown: editor.getMarkdown,
    edit: {
      onEditStart: ai.start,
      onEditStream: ai.onEditStream,
      onEditStop: ai.stop,
    },
  });
  hostRef.current.getMarkdown = editor.getMarkdown;
  hostRef.current.edit.onEditStart = ai.start;
  hostRef.current.edit.onEditStream = ai.onEditStream;
  hostRef.current.edit.onEditStop = ai.stop;

  const { register: registerHost, unregister: unregisterHost } = home?.pageHosts ?? {};
  useEffect(() => {
    if (!registerHost || !unregisterHost || !active) {
      return undefined;
    }
    registerHost(page.path, hostRef.current);
    return () => unregisterHost(page.path);
  }, [registerHost, unregisterHost, active, page.path]);

  const handleClose = useCallback(() => {
    void editor.onFlushSave();
    onClose();
  }, [editor.onFlushSave, onClose]);

  useKeyboardShortcuts({ onClose: handleClose, active, editor, threads, comments, chrome, find });

  return {
    page,
    busy,
    auth,
    onClose: handleClose,
    onCreatePublication,
    editor: { ...editor, commentsOn: comments.commentsOn },
    threads,
    comments,
    chrome,
    find,
    resize,
    ai,
  };
}

export type EditorControllerApi = ReturnType<typeof useEditorController>;
