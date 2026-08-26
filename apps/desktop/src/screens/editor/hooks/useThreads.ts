import { useCallback, useEffect, useState } from "react";
import type { PagePayload, ReviewThread } from "../../../../shared/api";

const api = () => window.slashmd;

type Params = {
  page: PagePayload;
  focusThreadId?: string | null;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
};

export function useThreads({ page, focusThreadId, run }: Params) {
  const [threads, setThreads] = useState<ReviewThread[]>([]);
  const [orphans, setOrphans] = useState<ReviewThread[]>([]);
  const [openThread, setOpenThread] = useState<ReviewThread | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(page.prUrl);

  const onThreadsRefresh = useCallback(async () => {
    const loaded = await api().loadThreads(page.path);
    setThreads(loaded.threads);
    setCanWrite(loaded.canWrite);
    setPrUrl(loaded.prUrl || page.prUrl);
    return loaded.threads;
  }, [page.path, page.prUrl]);

  useEffect(() => {
    void onThreadsRefresh().then((list) => {
      if (!focusThreadId) {
        return;
      }
      const match = list.find((thread) => thread.id === focusThreadId);
      if (match) {
        setOpenThread(match);
      }
    });
  }, [page.path, page.markdown, onThreadsRefresh, focusThreadId]);

  const openPr = prUrl || page.prUrl;

  function onThreadOpen(thread: ReviewThread) {
    setOpenThread(thread);
  }

  function onThreadClose() {
    setOpenThread(null);
  }

  function onThreadOpenFirst() {
    const first = threads[0];
    if (first) {
      setOpenThread(first);
    }
  }

  function onOrphansChange(next: ReviewThread[]) {
    setOrphans(next);
  }

  async function onThreadReply(body: string) {
    if (!openThread) {
      return;
    }
    await run(() => api().threadReply(page.path, openThread.id, body));
    await onThreadsRefresh();
  }

  async function onThreadResolve(resolved: boolean) {
    if (!openThread) {
      return;
    }
    await run(() => api().threadResolve(page.path, openThread.id, resolved));
    await onThreadsRefresh();
    setOpenThread(null);
  }

  function onOpenGithub() {
    if (!openThread) {
      return;
    }
    void api().openUrl(openThread.url || openPr || "");
  }

  return {
    threads,
    orphans,
    openThread,
    canWrite,
    openPr,
    onThreadOpen,
    onThreadClose,
    onThreadOpenFirst,
    onThreadsRefresh,
    onOrphansChange,
    onThreadReply,
    onThreadResolve,
    onOpenGithub,
  };
}

export type ThreadsApi = ReturnType<typeof useThreads>;
