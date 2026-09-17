import { useCallback, useEffect, useRef } from "react";

const FOCUS_THROTTLE_MS = 1500;

type Params = {
  onRefresh: () => Promise<void> | void;
  onReloadPage: () => Promise<void> | void;
};

/** Re-sync workspace + open page when the window regains focus. */
export function useFocusRefresh({ onRefresh, onReloadPage }: Params) {
  const onRefreshRef = useRef(onRefresh);
  const onReloadRef = useRef(onReloadPage);
  const lastRunAtRef = useRef(0);
  onRefreshRef.current = onRefresh;
  onReloadRef.current = onReloadPage;

  const onFocus = useCallback(() => {
    const now = Date.now();
    if (now - lastRunAtRef.current < FOCUS_THROTTLE_MS) {
      return;
    }
    lastRunAtRef.current = now;
    void Promise.all([onRefreshRef.current(), onReloadRef.current()]).catch(() => undefined);
  }, []);

  useEffect(() => {
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [onFocus]);
}