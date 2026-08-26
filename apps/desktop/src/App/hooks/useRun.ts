import { useCallback, useRef, useState } from "react";
import type { Run } from "../../screens/home/types";
import { toErrorMessage } from "../utils";

export function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const onError = useCallback((message: string | null) => {
    setError(message);
  }, []);

  const run = useCallback<Run>(async (fn) => {
    if (busyRef.current) {
      return undefined;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(toErrorMessage(err));
      return undefined;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, error, run, onError };
}

export type RunApi = ReturnType<typeof useRun>;
