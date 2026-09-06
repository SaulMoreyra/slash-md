import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchHandle } from "@slash-md/ui/editor/plugins/search";
import {
  registerFindInPageCloser,
  registerFindInPageOpener,
} from "../findInPageBridge";

type Params = {
  docPath: string;
  onThreadClose: () => void;
  onCloseLibrarySearch?: () => void;
};

const DEBOUNCE_MS = 150;

export function useFindInPage({ docPath, onThreadClose, onCloseLibrarySearch }: Params) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<SearchHandle | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueryRef = useRef<string | null>(null);
  const queryRef = useRef(query);
  const docPathRef = useRef(docPath);

  queryRef.current = query;

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const onClose = useCallback(() => {
    clearDebounce();
    handleRef.current?.clear();
    setOpen(false);
    setQuery("");
    setActive(0);
    setTotal(0);
    pendingQueryRef.current = null;
  }, [clearDebounce]);

  const runSearch = useCallback((nextQuery: string) => {
    const handle = handleRef.current;
    if (!handle) {
      pendingQueryRef.current = nextQuery;
      return;
    }
    pendingQueryRef.current = null;
    const state = handle.search(nextQuery);
    setActive(state.active);
    setTotal(state.total);
  }, []);

  const onOpen = useCallback(() => {
    onCloseLibrarySearch?.();
    onThreadClose();
    setOpen(true);

    const selection = handleRef.current?.getSelectionText() ?? "";
    const nextQuery = selection || queryRef.current;
    setQuery(nextQuery);
    runSearch(nextQuery);

    requestAnimationFrame(() => {
      const input = inputRef.current;
      input?.focus();
      if (selection) {
        input?.select();
      }
    });
  }, [onCloseLibrarySearch, onThreadClose, runSearch]);

  const onFocusInput = useCallback(() => {
    requestAnimationFrame(() => {
      const input = inputRef.current;
      input?.focus();
      input?.select();
    });
  }, []);

  const onQueryChange = useCallback(
    (next: string) => {
      setQuery(next);
      clearDebounce();
      debounceRef.current = setTimeout(() => runSearch(next), DEBOUNCE_MS);
    },
    [clearDebounce, runSearch],
  );

  const onNext = useCallback(() => {
    const state = handleRef.current?.next();
    if (state) {
      setActive(state.active);
      setTotal(state.total);
    }
  }, []);

  const onPrev = useCallback(() => {
    const state = handleRef.current?.prev();
    if (state) {
      setActive(state.active);
      setTotal(state.total);
    }
  }, []);

  const onSearchReady = useCallback(
    (handle: SearchHandle | null) => {
      unsubRef.current?.();
      unsubRef.current = null;

      if (!handle) {
        handleRef.current = null;
        return;
      }

      handleRef.current = handle;
      unsubRef.current = handle.subscribe((state) => {
        setActive(state.active);
        setTotal(state.total);
      });

      if (pendingQueryRef.current !== null) {
        const pending = pendingQueryRef.current;
        pendingQueryRef.current = null;
        setQuery(pending);
        runSearch(pending);
      }
    },
    [runSearch],
  );

  useEffect(() => {
    const unregisterOpen = registerFindInPageOpener(onOpen);
    const unregisterClose = registerFindInPageCloser(onClose);
    return () => {
      unregisterOpen();
      unregisterClose();
    };
  }, [onOpen, onClose]);

  useEffect(() => {
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
      handleRef.current = null;
      clearDebounce();
    };
  }, [clearDebounce]);

  useEffect(() => {
    if (docPathRef.current === docPath) {
      return;
    }
    docPathRef.current = docPath;
    onClose();
  }, [docPath, onClose]);

  return {
    open,
    query,
    active,
    total,
    inputRef,
    onOpen,
    onClose,
    onFocusInput,
    onQueryChange,
    onNext,
    onPrev,
    onSearchReady,
  };
}

export type FindInPageApi = ReturnType<typeof useFindInPage>;
