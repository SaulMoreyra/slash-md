import { useCallback, useState } from "react";
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

  const onOpenPage = useCallback(
    async (path: string, threadId?: string) => {
      await runOp(AppOperation.OpenPage, async () => {
        setFocusThreadId(threadId ?? null);
        setPage(await api().openPage(path));
      });
    },
    [runOp],
  );

  const onClosePage = useCallback(() => {
    setPage(null);
    setFocusThreadId(null);
  }, []);

  const onPage = useCallback((next: PagePayload) => {
    setPage(next);
  }, []);

  return { page, focusThreadId, onOpenPage, onClosePage, onPage };
}

export type PageSessionApi = ReturnType<typeof usePageSession>;
