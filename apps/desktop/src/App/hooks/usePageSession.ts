import { useCallback, useState } from "react";
import type { PagePayload } from "../../../shared/api";
import type { Run } from "../../screens/home/types";

const api = () => window.slashmd;

type Params = {
  run: Run;
};

export function usePageSession({ run }: Params) {
  const [page, setPage] = useState<PagePayload | null>(null);
  const [focusThreadId, setFocusThreadId] = useState<string | null>(null);

  const onOpenPage = useCallback(
    async (path: string, threadId?: string) => {
      await run(async () => {
        setFocusThreadId(threadId ?? null);
        setPage(await api().openPage(path));
      });
    },
    [run],
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
