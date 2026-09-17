import { useCallback, useRef, useState } from "react";
import type { PagePayload } from "../../../shared/api";
import { AppOperation } from "../enums";
import type { RunOp } from "./useOperationsController";

const api = () => window.slashmd;

type Params = {
  runOp: RunOp;
};

export function usePageSession({ runOp }: Params) {
  const [page, setPage] = useState<PagePayload | null>(null);
  const [focusThreadId, setFocusThreadId] = useState<string | null>(null);
  const pageRef = useRef<PagePayload | null>(page);
  pageRef.current = page;

  const onOpenPage = useCallback(
    async (path: string, threadId?: string) => {
      await runOp(AppOperation.OpenPage, async () => {
        setFocusThreadId(threadId ?? null);
        setPage(await api().openPage(path));
      });
    },
    [runOp],
  );

  const onReloadPage = useCallback(async () => {
    const current = pageRef.current;
    if (!current) {
      return;
    }
    setPage(await api().openPage(current.path));
  }, []);

  const onClosePage = useCallback(() => {
    setPage(null);
    setFocusThreadId(null);
  }, []);

  const onPage = useCallback((next: PagePayload) => {
    setPage(next);
  }, []);

  return { page, focusThreadId, onOpenPage, onReloadPage, onClosePage, onPage };
}

export type PageSessionApi = ReturnType<typeof usePageSession>;
