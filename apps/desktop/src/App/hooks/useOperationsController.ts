import { useCallback, useRef, useState } from "react";
import { toast } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { GitSnapshot } from "../../../shared/api";
import { AppOperation, isBackgroundOperation } from "../enums";
import { toErrorMessage } from "../utils";
import type { RunApi } from "./useRun";

export type RunOp = <T>(op: AppOperation, fn: () => Promise<T>) => Promise<T | undefined>;

const EMPTY_GIT: GitSnapshot = { branch: null };

export type OperationsApi = {
  busy: boolean;
  operation: AppOperation | null;
  pending: number;
  error: string | null;
  runOp: RunOp;
  refresh: () => Promise<void>;
  git: GitSnapshot;
  onGit: (snapshot: GitSnapshot) => void;
  onSyncGit: () => Promise<void>;
};

type QueueItem = {
  op: AppOperation;
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  promise: Promise<unknown>;
};

type Params = {
  run: RunApi["run"];
  onRefresh: () => Promise<void>;
  error: string | null;
};

export function useOperationsController({ run, onRefresh, error }: Params): OperationsApi {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState<AppOperation | null>(null);
  const [pending, setPending] = useState(0);
  const [git, setGit] = useState<GitSnapshot>(EMPTY_GIT);
  const queueRef = useRef<QueueItem[]>([]);
  const inflightRef = useRef<{ op: AppOperation; promise: Promise<unknown> } | null>(null);
  const pumpingRef = useRef(false);
  const runRef = useRef(run);
  const onRefreshRef = useRef(onRefresh);
  runRef.current = run;
  onRefreshRef.current = onRefresh;

  const labelFor = useCallback((op: AppOperation) => t(`operations.names.${op}`), [t]);

  const findExisting = useCallback((op: AppOperation): Promise<unknown> | undefined => {
    if (inflightRef.current?.op === op) {
      return inflightRef.current.promise;
    }
    return queueRef.current.find((item) => item.op === op)?.promise;
  }, []);

  const pump = useCallback(async () => {
    if (pumpingRef.current) {
      return;
    }
    pumpingRef.current = true;
    setBusy(true);
    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current.shift()!;
        inflightRef.current = { op: item.op, promise: item.promise };
        setPending(queueRef.current.length);
        setOperation(item.op);
        const result = await runRef.current(async () => {
          try {
            return await item.fn();
          } catch (err) {
            toast.danger(toErrorMessage(err));
            throw err;
          }
        });
        item.resolve(result);
        inflightRef.current = null;
      }
    } finally {
      pumpingRef.current = false;
      inflightRef.current = null;
      setOperation(null);
      setPending(0);
      setBusy(false);
    }
  }, []);

  const runOp = useCallback<RunOp>(
    async (op, fn) => {
      const occupied =
        pumpingRef.current || queueRef.current.length > 0 || inflightRef.current !== null;

      if (occupied && isBackgroundOperation(op)) {
        return undefined;
      }

      const existing = findExisting(op);
      if (existing) {
        toast.info(t("operations.alreadyRunning", { operation: labelFor(op) }));
        return existing as Promise<undefined>;
      }

      if (occupied) {
        toast.info(t("operations.queued", { operation: labelFor(op) }));
      }

      let resolve!: (value: unknown) => void;
      const promise = new Promise<unknown>((res) => {
        resolve = res;
      });
      queueRef.current.push({ op, fn, resolve, promise });
      if (occupied) {
        setPending(queueRef.current.length);
      }
      void pump();
      return promise as Promise<undefined>;
    },
    [findExisting, labelFor, pump, t],
  );

  const refresh = useCallback(async () => {
    await runOp(AppOperation.Refresh, () => onRefreshRef.current());
  }, [runOp]);

  const onGit = useCallback((snapshot: GitSnapshot) => {
    setGit(snapshot);
  }, []);

  const onSyncGit = useCallback(async () => {
    const next = await window.slashmd?.gitStatus?.();
    setGit(next ?? EMPTY_GIT);
  }, []);

  return { busy, operation, pending, error, runOp, refresh, git, onGit, onSyncGit };
}
